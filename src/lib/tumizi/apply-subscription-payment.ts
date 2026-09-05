import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@prisma/client';
import { mapTumiziEventToOrderPaymentStatus } from '@/lib/tumizi/webhook';
import { completeSubscriptionFromPaymentLog } from '@/lib/subscriptions/complete-subscription-payment';
import { TUMIZI_SUBSCRIPTION_GATEWAY } from '@/lib/subscriptions/tumizi-subscription';

export type ApplyTumiziSubscriptionPaymentResult = {
  applied: boolean;
  reason?: string;
  subscriptionType?: string;
};

export async function applyTumiziSubscriptionPaymentStatus(params: {
  tenantId: string;
  externalReference: string;
  tumiziStatus?: string;
  transactionReference?: string;
  event?: string;
  rawPayload?: unknown;
}): Promise<ApplyTumiziSubscriptionPaymentResult> {
  const { tenantId, externalReference, tumiziStatus, transactionReference, event, rawPayload } =
    params;

  const paymentLog = await prisma.payment_logs.findFirst({
    where: {
      tenant_id: tenantId,
      gateway: TUMIZI_SUBSCRIPTION_GATEWAY,
      OR: [{ payment_id: externalReference }, { transaction_id: externalReference }],
    },
  });

  if (!paymentLog) {
    return { applied: false, reason: 'payment_log_not_found' };
  }

  const mappedStatus = mapTumiziEventToOrderPaymentStatus(event, tumiziStatus);
  const metadata = (paymentLog.metadata ?? {}) as Record<string, unknown>;

  if (mappedStatus === 'pending') {
    await prisma.payment_logs.update({
      where: { id: paymentLog.id },
      data: {
        metadata: {
          ...metadata,
          tumizi_event: event ?? metadata.tumizi_event,
          tumizi_status: tumiziStatus ?? metadata.tumizi_status,
          tumizi_synced_at: new Date().toISOString(),
          ...(rawPayload !== undefined ? { tumizi_payload: rawPayload } : {}),
        } as Prisma.InputJsonValue,
      },
    });
    return { applied: true, subscriptionType: undefined };
  }

  if (mappedStatus === 'failed') {
    await prisma.payment_logs.update({
      where: { id: paymentLog.id },
      data: {
        status: 'failed',
        metadata: {
          ...metadata,
          tumizi_event: event ?? metadata.tumizi_event,
          tumizi_status: tumiziStatus ?? metadata.tumizi_status,
          tumizi_synced_at: new Date().toISOString(),
          ...(rawPayload !== undefined ? { tumizi_payload: rawPayload } : {}),
        } as Prisma.InputJsonValue,
      },
    });
    return { applied: true, reason: 'payment_failed' };
  }

  if (paymentLog.status === 'completed') {
    return {
      applied: true,
      subscriptionType: (metadata.subscription_type as string) || 'activation',
    };
  }

  const result = await completeSubscriptionFromPaymentLog({
    paymentLogId: paymentLog.id,
    transactionReference: transactionReference || paymentLog.transaction_id,
    paymentMethod: 'tumizi_subscription',
    rawMetadata: {
      tumizi_event: event,
      tumizi_status: tumiziStatus,
      tumizi_synced_at: new Date().toISOString(),
      ...(rawPayload !== undefined ? { tumizi_payload: rawPayload } : {}),
    },
  });

  return {
    applied: true,
    subscriptionType: result.subscriptionType,
  };
}

export async function findTumiziSubscriptionPaymentByExternalReference(
  externalReference: string,
) {
  return prisma.payment_logs.findFirst({
    where: {
      gateway: TUMIZI_SUBSCRIPTION_GATEWAY,
      OR: [{ payment_id: externalReference }, { transaction_id: externalReference }],
    },
    select: {
      id: true,
      tenant_id: true,
      status: true,
    },
  });
}
