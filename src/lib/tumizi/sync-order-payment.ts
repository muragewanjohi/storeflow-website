import { prisma } from '@/lib/prisma/client';
import { tumiziClient } from '@/lib/tumizi/client';
import {
  applyTumiziCustomerPaymentStatus,
  extractTumiziCustomerPaymentStatus,
} from '@/lib/tumizi/apply-payment-status';
import { mapTumiziStatusToOrderPaymentStatus } from '@/lib/tumizi/webhook';

export type SyncTumiziOrderPaymentResult = {
  synced: boolean;
  payment_status?: string | null;
  reason?: string;
  tumizi_status?: string;
};

type TumiziAttemptPoll = {
  externalReference: string;
  tumiziStatus: string;
  transactionReference?: string;
  mappedStatus: 'paid' | 'pending' | 'failed';
};

async function listTumiziPaymentReferencesForOrder(
  orderId: string,
  tenantId: string,
  paymentTrack?: string | null,
): Promise<string[]> {
  const paymentLogs = await prisma.payment_logs.findMany({
    where: {
      tenant_id: tenantId,
      gateway: 'tumizi_customer_payment',
      metadata: {
        path: ['order_id'],
        equals: orderId,
      },
    },
    orderBy: { created_at: 'desc' },
    select: { payment_id: true },
  });

  return [
    ...new Set(
      [
        paymentTrack?.trim() || null,
        ...paymentLogs.map((row) => row.payment_id).filter(Boolean),
      ].filter((value): value is string => Boolean(value)),
    ),
  ];
}

const TUMIZI_PAID_STATUSES = new Set([
  'successful',
  'success',
  'succeeded',
  'completed',
  'paid',
]);

function isTumiziPaidMetadataStatus(status: unknown): boolean {
  return typeof status === 'string' && TUMIZI_PAID_STATUSES.has(status.toLowerCase());
}

async function recoverPaidOrderFromCompletedLog(
  orderId: string,
  tenantId: string,
): Promise<SyncTumiziOrderPaymentResult | null> {
  const paymentLogs = await prisma.payment_logs.findMany({
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

  const completedLog =
    paymentLogs.find((row) => row.status === 'completed') ??
    paymentLogs.find((row) => {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      return isTumiziPaidMetadataStatus(metadata.tumizi_status);
    });

  if (!completedLog) {
    return null;
  }

  if (completedLog.status !== 'completed') {
    await prisma.payment_logs.update({
      where: { id: completedLog.id },
      data: { status: 'completed' },
    });
  }

  await prisma.orders.updateMany({
    where: { id: orderId, tenant_id: tenantId },
    data: {
      payment_status: 'paid',
      payment_gateway: 'tumizi',
      payment_track: completedLog.payment_id,
      transaction_id: completedLog.transaction_id,
    },
  });

  return {
    synced: true,
    payment_status: 'paid',
    reason: 'recovered_from_completed_payment_log',
  };
}

async function pollTumiziPaymentAttempts(
  externalReferences: string[],
): Promise<TumiziAttemptPoll[]> {
  const attempts: TumiziAttemptPoll[] = [];

  for (const externalReference of externalReferences) {
    try {
      const response = await tumiziClient.getCustomerPayment(externalReference);
      const { status, transactionReference } = extractTumiziCustomerPaymentStatus(response);

      if (!status) {
        continue;
      }

      attempts.push({
        externalReference,
        tumiziStatus: status,
        transactionReference,
        mappedStatus: mapTumiziStatusToOrderPaymentStatus(status),
      });
    } catch (error) {
      console.error('[Tumizi] poll payment attempt failed:', externalReference, error);
    }
  }

  return attempts;
}

function pickBestTumiziAttempt(attempts: TumiziAttemptPoll[]): TumiziAttemptPoll | null {
  const paidAttempt = attempts.find((attempt) => attempt.mappedStatus === 'paid');
  if (paidAttempt) {
    return paidAttempt;
  }

  const pendingAttempt = attempts.find((attempt) => attempt.mappedStatus === 'pending');
  if (pendingAttempt) {
    return pendingAttempt;
  }

  return attempts[0] ?? null;
}

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

  const recovered = await recoverPaidOrderFromCompletedLog(orderId, tenantId);
  if (recovered) {
    return recovered;
  }

  const externalReferences = await listTumiziPaymentReferencesForOrder(
    orderId,
    tenantId,
    order.payment_track,
  );

  if (externalReferences.length === 0) {
    return { synced: false, reason: 'missing_external_reference', payment_status: order.payment_status };
  }

  try {
    const attempts = await pollTumiziPaymentAttempts(externalReferences);
    const bestAttempt = pickBestTumiziAttempt(attempts);

    if (!bestAttempt) {
      return {
        synced: false,
        reason: 'missing_tumizi_status',
        payment_status: order.payment_status,
      };
    }

    const result = await applyTumiziCustomerPaymentStatus({
      tenantId,
      externalReference: bestAttempt.externalReference,
      tumiziStatus: bestAttempt.tumiziStatus,
      transactionReference: bestAttempt.transactionReference,
      event: 'partner.customer_payment.updated',
    });

    const updated = await prisma.orders.findFirst({
      where: { id: orderId, tenant_id: tenantId },
      select: { payment_status: true },
    });

    return {
      synced: result.applied,
      payment_status: updated?.payment_status ?? order.payment_status,
      tumizi_status: bestAttempt.tumiziStatus,
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
      payment_status: { in: ['pending', 'failed'] },
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
    if (result.synced && result.payment_status && result.payment_status !== row.payment_status) {
      updated += 1;
    }
    if (result.reason === 'tumizi_api_error' || result.reason?.includes('TUMIZI')) {
      errors += 1;
    }
  }

  return { processed: pendingOrders.length, updated, errors };
}
