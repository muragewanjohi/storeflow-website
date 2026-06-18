import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { verifyPaymentWebhookRequest } from '@/lib/payments/webhook-auth';
import { findTenantIdByTumiziMerchantExternalId } from '@/lib/tumizi/config';
import { applyTumiziCustomerPaymentStatus } from '@/lib/tumizi/apply-payment-status';
import {
  applyTumiziSubscriptionPaymentStatus,
  findTumiziSubscriptionPaymentByExternalReference,
} from '@/lib/tumizi/apply-subscription-payment';
import {
  normalizeTumiziEventPayload,
  shouldProcessTumiziWebhookEvent,
} from '@/lib/tumizi/webhook';

export const dynamic = 'force-dynamic';

async function processTumiziWebhookEvent(input: {
  normalized: ReturnType<typeof normalizeTumiziEventPayload>;
  webhookEventId: string;
  tenantId: string;
}) {
  const subscriptionPayment = await findTumiziSubscriptionPaymentByExternalReference(
    input.normalized.externalReference!,
  );

  if (subscriptionPayment) {
    const applyResult = await applyTumiziSubscriptionPaymentStatus({
      tenantId: subscriptionPayment.tenant_id,
      externalReference: input.normalized.externalReference!,
      tumiziStatus: input.normalized.status,
      transactionReference: input.normalized.transactionReference,
      event: input.normalized.event,
      rawPayload: input.normalized.raw,
    });

    if (!applyResult.applied) {
      await prisma.tumizi_webhook_events.update({
        where: { id: input.webhookEventId },
        data: {
          processing_status: 'ignored',
          processing_error: applyResult.reason ?? 'subscription_payment_not_applied',
          processed_at: new Date(),
        },
      });
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: applyResult.reason ?? 'subscription_payment_not_applied',
      });
    }

    await prisma.tumizi_webhook_events.update({
      where: { id: input.webhookEventId },
      data: {
        tenant_id: subscriptionPayment.tenant_id,
        processing_status: 'processed',
        processing_error: null,
        processed_at: new Date(),
      },
    });

    return NextResponse.json({ success: true, scope: 'subscription' });
  }

  const applyResult = await applyTumiziCustomerPaymentStatus({
    tenantId: input.tenantId,
    externalReference: input.normalized.externalReference!,
    tumiziStatus: input.normalized.status,
    transactionReference: input.normalized.transactionReference,
    event: input.normalized.event,
    rawPayload: input.normalized.raw,
  });

  if (!applyResult.applied) {
    await prisma.tumizi_webhook_events.update({
      where: { id: input.webhookEventId },
      data: {
        processing_status: 'ignored',
        processing_error: applyResult.reason ?? 'payment_log_not_found',
        processed_at: new Date(),
      },
    });
    return NextResponse.json({
      success: true,
      ignored: true,
      reason: applyResult.reason ?? 'payment_log_not_found',
    });
  }

  await prisma.tumizi_webhook_events.update({
    where: { id: input.webhookEventId },
    data: {
      processing_status: 'processed',
      processing_error: null,
      processed_at: new Date(),
    },
  });

  return NextResponse.json({ success: true, scope: 'order' });
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyPaymentWebhookRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const normalized = normalizeTumiziEventPayload(body);

    if (!shouldProcessTumiziWebhookEvent(normalized.event)) {
      return NextResponse.json({ success: true, ignored: true, reason: 'unsupported_event' });
    }

    if (!normalized.externalReference) {
      return NextResponse.json({ success: true, ignored: true, reason: 'missing_external_reference' });
    }

    const subscriptionPayment = await findTumiziSubscriptionPaymentByExternalReference(
      normalized.externalReference,
    );

    const existingEvent = await prisma.tumizi_webhook_events.findFirst({
      where: {
        event_name: normalized.event,
        external_reference: normalized.externalReference,
      },
    });
    if (existingEvent?.processing_status === 'processed') {
      return NextResponse.json({ success: true, duplicate: true });
    }

    const tenantId =
      subscriptionPayment?.tenant_id ??
      (normalized.merchantExternalId
        ? await findTenantIdByTumiziMerchantExternalId(normalized.merchantExternalId)
        : null);

    const webhookEvent = existingEvent
      ? await prisma.tumizi_webhook_events.update({
          where: { id: existingEvent.id },
          data: {
            tenant_id: tenantId,
            merchant_external_id: normalized.merchantExternalId ?? null,
            payload: normalized.raw as any,
            processing_status: 'processing',
            processing_error: null,
          },
        })
      : await prisma.tumizi_webhook_events.create({
          data: {
            tenant_id: tenantId,
            event_name: normalized.event!,
            external_reference: normalized.externalReference,
            merchant_external_id: normalized.merchantExternalId ?? null,
            payload: normalized.raw as any,
            processing_status: 'processing',
          },
        });

    if (!tenantId) {
      await prisma.tumizi_webhook_events.update({
        where: { id: webhookEvent.id },
        data: {
          processing_status: 'ignored',
          processing_error: 'tenant_not_found',
          processed_at: new Date(),
        },
      });
      return NextResponse.json({ success: true, ignored: true, reason: 'tenant_not_found' });
    }

    return processTumiziWebhookEvent({
      normalized,
      webhookEventId: webhookEvent.id,
      tenantId,
    });
  } catch (error) {
    console.error('[Tumizi Webhook] Failed to process webhook:', error);
    return NextResponse.json({ success: false, error: 'Webhook processing failed' }, { status: 500 });
  }
}
