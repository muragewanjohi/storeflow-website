import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { verifyPaymentWebhookRequest } from '@/lib/payments/webhook-auth';
import { findTenantIdByTumiziMerchantExternalId } from '@/lib/tumizi/config';
import {
  mapTumiziEventToOrderPaymentStatus,
  normalizeTumiziEventPayload,
  shouldProcessTumiziWebhookEvent,
} from '@/lib/tumizi/webhook';

export const dynamic = 'force-dynamic';

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
      normalized.merchantExternalId
        ? await findTenantIdByTumiziMerchantExternalId(normalized.merchantExternalId)
        : null;

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

    const paymentLog = await prisma.payment_logs.findFirst({
      where: {
        tenant_id: tenantId,
        gateway: {
          in: ['tumizi_customer_payment', 'tumizi_withdrawal', 'tumizi_refund'],
        },
        OR: [
          { payment_id: normalized.externalReference },
          { transaction_id: normalized.externalReference },
        ],
      },
      include: {
        tenants: {
          select: { id: true },
        },
      },
    });

    if (!paymentLog) {
      await prisma.tumizi_webhook_events.update({
        where: { id: webhookEvent.id },
        data: {
          processing_status: 'ignored',
          processing_error: 'payment_log_not_found',
          processed_at: new Date(),
        },
      });
      return NextResponse.json({ success: true, ignored: true, reason: 'payment_log_not_found' });
    }

    const mappedStatus = mapTumiziEventToOrderPaymentStatus(normalized.event, normalized.status);
    const orderPaymentStatus =
      normalized.event === 'partner.refund.updated' && mappedStatus !== 'refunded'
        ? 'paid'
        : mappedStatus;
    const metadata = (paymentLog.metadata ?? {}) as Record<string, unknown>;

    await prisma.payment_logs.update({
      where: { id: paymentLog.id },
      data: {
        status: mappedStatus === 'paid' || mappedStatus === 'refunded' ? 'completed' : mappedStatus,
        transaction_id: normalized.transactionReference || paymentLog.transaction_id,
        metadata: {
          ...metadata,
          tumizi_event: normalized.event,
          tumizi_status: normalized.status,
          tumizi_webhook_received_at: new Date().toISOString(),
          tumizi_payload: normalized.raw,
        } as any,
      },
    });

    const orderId = typeof metadata.order_id === 'string' ? metadata.order_id : undefined;
    if (orderId) {
      await prisma.orders.updateMany({
        where: { id: orderId, tenant_id: tenantId },
        data: {
          payment_status: orderPaymentStatus,
          transaction_id: normalized.transactionReference || paymentLog.transaction_id,
          payment_gateway: 'tumizi',
        },
      });
    }

    await prisma.tumizi_webhook_events.update({
      where: { id: webhookEvent.id },
      data: {
        processing_status: 'processed',
        processing_error: null,
        processed_at: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Tumizi Webhook] Failed to process webhook:', error);
    return NextResponse.json({ success: false, error: 'Webhook processing failed' }, { status: 500 });
  }
}
