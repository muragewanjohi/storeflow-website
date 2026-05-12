import { prisma } from '@/lib/prisma/client';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';
import { tumiziClient } from '@/lib/tumizi/client';

interface InitiateTumiziRefundForOrderParams {
  tenantId: string;
  order: {
    id: string;
    order_number: string;
    payment_track: string | null;
    transaction_id: string | null;
  };
  reason?: string;
  userId?: string | null;
}

export async function initiateTumiziRefundForOrder(
  params: InitiateTumiziRefundForOrderParams,
): Promise<{
  externalReference: string;
  paymentReference: string;
  response: Record<string, unknown>;
}> {
  const { tenantId, order, reason, userId } = params;

  const tumiziConfig = await getTumiziTenantConfigByTenantId(tenantId);
  if (!tumiziConfig?.enabled || !tumiziConfig.merchantExternalId) {
    throw new Error('Tumizi is not enabled for this store');
  }

  const externalReference = `refund-order-${order.id}`;

  const existingRefundLog = await prisma.payment_logs.findFirst({
    where: {
      tenant_id: tenantId,
      gateway: 'tumizi_refund',
      payment_id: externalReference,
    },
  });
  if (existingRefundLog) {
    return {
      externalReference,
      paymentReference: existingRefundLog.transaction_id || '',
      response: {
        reused: true,
        payment_id: existingRefundLog.payment_id,
        transaction_id: existingRefundLog.transaction_id,
      },
    };
  }

  const sourceLookupOr = [
    ...(order.payment_track ? [{ payment_id: order.payment_track }] : []),
    ...(order.transaction_id ? [{ transaction_id: order.transaction_id }] : []),
  ];
  const sourcePaymentLog =
    sourceLookupOr.length > 0
      ? await prisma.payment_logs.findFirst({
          where: {
            tenant_id: tenantId,
            gateway: 'tumizi_customer_payment',
            OR: sourceLookupOr,
          },
          orderBy: { created_at: 'desc' },
        })
      : null;

  const paymentReference = sourcePaymentLog?.transaction_id || order.transaction_id;
  if (!paymentReference) {
    throw new Error('Could not determine Tumizi payment reference for refund');
  }

  const response = await tumiziClient.createMerchantRefund({
    merchant_external_id: tumiziConfig.merchantExternalId,
    external_reference: externalReference,
    payment_reference: paymentReference,
    reason: reason?.trim() || `Order ${order.order_number} cancelled`,
  });

  const refundReference =
    (response?.data as Record<string, unknown> | undefined)?.refund_reference ||
    (response as Record<string, unknown>)['refund_reference'];

  await prisma.payment_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: userId ?? null,
      gateway: 'tumizi_refund',
      amount: sourcePaymentLog?.amount ?? 0,
      currency: sourcePaymentLog?.currency || 'KES',
      status: 'pending',
      payment_id: externalReference,
      transaction_id:
        typeof refundReference === 'string' && refundReference.trim()
          ? refundReference.trim()
          : paymentReference,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        source: 'tumizi_order_refund',
        original_payment_track: order.payment_track,
        original_payment_reference: paymentReference,
        response,
      } as any,
    },
  });

  return { externalReference, paymentReference, response };
}
