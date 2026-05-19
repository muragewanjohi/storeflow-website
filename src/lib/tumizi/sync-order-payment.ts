import { prisma } from '@/lib/prisma/client';
import { tumiziClient } from '@/lib/tumizi/client';
import {
  applyTumiziCustomerPaymentStatus,
  extractTumiziCustomerPaymentStatus,
} from '@/lib/tumizi/apply-payment-status';

export type SyncTumiziOrderPaymentResult = {
  synced: boolean;
  payment_status?: string | null;
  reason?: string;
  tumizi_status?: string;
};

export async function syncTumiziOrderPaymentByOrderId(
  orderId: string,
  tenantId: string,
): Promise<SyncTumiziOrderPaymentResult> {
  const order = await prisma.orders.findFirst({
    where: { id: orderId, tenant_id: tenantId },
    select: {
      id: true,
      payment_gateway: true,
      payment_status: true,
      payment_track: true,
    },
  });

  if (!order) {
    return { synced: false, reason: 'order_not_found' };
  }

  if (order.payment_gateway !== 'tumizi') {
    return { synced: false, reason: 'not_tumizi_order' };
  }

  if (order.payment_status === 'paid' || order.payment_status === 'refunded') {
    return {
      synced: false,
      reason: 'already_final',
      payment_status: order.payment_status,
    };
  }

  let externalReference = order.payment_track?.trim() || null;

  if (!externalReference) {
    const paymentLog = await prisma.payment_logs.findFirst({
      where: {
        tenant_id: tenantId,
        gateway: 'tumizi_customer_payment',
        metadata: {
          path: ['order_id'],
          equals: orderId,
        },
      },
      orderBy: { created_at: 'desc' },
    });
    if (paymentLog?.payment_id) {
      externalReference = paymentLog.payment_id;
    }
  }

  if (!externalReference) {
    return { synced: false, reason: 'missing_external_reference', payment_status: order.payment_status };
  }

  try {
    const response = await tumiziClient.getCustomerPayment(externalReference);
    const { status, transactionReference } = extractTumiziCustomerPaymentStatus(response);

    if (!status) {
      return {
        synced: false,
        reason: 'missing_tumizi_status',
        payment_status: order.payment_status,
      };
    }

    const result = await applyTumiziCustomerPaymentStatus({
      tenantId,
      externalReference,
      tumiziStatus: status,
      transactionReference,
      event: 'partner.customer_payment.updated',
      rawPayload: response,
    });

    const updated = await prisma.orders.findFirst({
      where: { id: orderId, tenant_id: tenantId },
      select: { payment_status: true },
    });

    return {
      synced: result.applied,
      payment_status: updated?.payment_status ?? order.payment_status,
      tumizi_status: status,
      reason: result.applied ? undefined : result.reason,
    };
  } catch (error) {
    console.error('[Tumizi] sync order payment failed:', orderId, error);
    return {
      synced: false,
      reason: error instanceof Error ? error.message : 'tumizi_api_error',
      payment_status: order.payment_status,
    };
  }
}

export async function syncPendingTumiziOrderPayments(options?: {
  maxAgeHours?: number;
  limit?: number;
}): Promise<{ processed: number; updated: number; errors: number }> {
  const maxAgeHours = options?.maxAgeHours ?? 48;
  const limit = options?.limit ?? 100;
  const since = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  const pendingOrders = await prisma.orders.findMany({
    where: {
      payment_gateway: 'tumizi',
      payment_status: 'pending',
      created_at: { gte: since },
    },
    select: { id: true, tenant_id: true, payment_status: true },
    orderBy: { created_at: 'asc' },
    take: limit,
  });

  let updated = 0;
  let errors = 0;

  for (const row of pendingOrders) {
    const result = await syncTumiziOrderPaymentByOrderId(row.id, row.tenant_id);
    if (result.synced && result.payment_status && result.payment_status !== 'pending') {
      updated += 1;
    }
    if (result.reason === 'tumizi_api_error' || result.reason?.includes('TUMIZI')) {
      errors += 1;
    }
  }

  return { processed: pendingOrders.length, updated, errors };
}
