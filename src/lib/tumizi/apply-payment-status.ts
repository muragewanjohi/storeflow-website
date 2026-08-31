import { prisma } from '@/lib/prisma/client';
import { sendPaymentStatusUpdateEmail } from '@/lib/orders/emails';
import { mapTumiziEventToOrderPaymentStatus } from '@/lib/tumizi/webhook';

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function readString(data: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function resolveTumiziCustomerPaymentRecord(
  response: Record<string, unknown>,
): Record<string, unknown> {
  const data = toObject(response.data ?? response);
  const nested = toObject(
    data.customer_payment ??
      data.customerPayment ??
      data.payment ??
      response.customer_payment ??
      response.customerPayment,
  );

  return Object.keys(nested).length > 0 ? nested : data;
}

export function extractTumiziCustomerPaymentStatus(response: Record<string, unknown>): {
  status?: string;
  transactionReference?: string;
} {
  const source = resolveTumiziCustomerPaymentRecord(response);
  return {
    status: readString(source, 'status') ?? readString(response, 'status'),
    transactionReference: readString(
      source,
      'mpesa_receipt_number',
      'transaction_reference',
      'payment_reference',
      'transactionReference',
    ) ?? readString(
      response,
      'mpesa_receipt_number',
      'transaction_reference',
      'payment_reference',
    ),
  };
}

export function shouldSkipTumiziOrderPaymentDowngrade(
  previousPaymentStatus: string | null | undefined,
  nextPaymentStatus: 'paid' | 'pending' | 'failed' | 'refunded',
): boolean {
  return (
    // 'deposit_paid' (basic deposit support, docs/SERVICES_PLAN.md) gets
    // the same protection 'paid' already has — a stale/duplicate webhook
    // must never downgrade an order that has genuinely received money.
    (previousPaymentStatus === 'paid' || previousPaymentStatus === 'deposit_paid') &&
    nextPaymentStatus !== 'paid' &&
    nextPaymentStatus !== 'refunded'
  );
}

/**
 * Basic deposit support (docs/SERVICES_PLAN.md). A Tumizi webhook only ever
 * reports 'paid' for a successful charge — it has no concept of "was this
 * the deposit leg or the balance leg." Distinguish by comparing what was
 * ACTUALLY requested at initiation time (paymentLogAmount, from
 * payment_logs — never trust anything from the webhook payload itself for
 * this) against the order's own recorded balance_amount: if it matches the
 * outstanding balance, the order is now genuinely fully settled ('paid');
 * otherwise (no deposit involved, or this was the deposit leg) it's either
 * 'paid' (no deposit_amount on the order at all) or 'deposit_paid'.
 */
export function resolveTumiziOrderPaymentStatus(
  mappedStatus: 'paid' | 'pending' | 'failed' | 'refunded',
  order: { deposit_amount: unknown; balance_amount: unknown } | null,
  paymentLogAmount: unknown,
): 'paid' | 'pending' | 'failed' | 'refunded' | 'deposit_paid' {
  if (mappedStatus !== 'paid' || !order || order.deposit_amount == null) {
    return mappedStatus;
  }
  const balance = order.balance_amount != null ? Number(order.balance_amount) : null;
  const paidNow = Number(paymentLogAmount);
  const isBalanceSettlement = balance != null && Math.abs(paidNow - balance) < 1;
  return isBalanceSettlement ? 'paid' : 'deposit_paid';
}

export type ApplyTumiziPaymentResult = {
  applied: boolean;
  orderId?: string;
  paymentStatus?: 'paid' | 'pending' | 'failed' | 'refunded' | 'deposit_paid';
  previousPaymentStatus?: string | null;
  reason?: string;
};

/**
 * Updates payment_logs + orders from a Tumizi customer payment status (webhook or API poll).
 */
export async function applyTumiziCustomerPaymentStatus(params: {
  tenantId: string;
  externalReference: string;
  tumiziStatus?: string;
  transactionReference?: string;
  event?: string;
  rawPayload?: unknown;
}): Promise<ApplyTumiziPaymentResult> {
  const { tenantId, externalReference, tumiziStatus, transactionReference, event, rawPayload } =
    params;

  const paymentLog = await prisma.payment_logs.findFirst({
    where: {
      tenant_id: tenantId,
      gateway: {
        in: ['tumizi_customer_payment', 'tumizi_withdrawal', 'tumizi_refund'],
      },
      OR: [{ payment_id: externalReference }, { transaction_id: externalReference }],
    },
  });

  if (!paymentLog) {
    return { applied: false, reason: 'payment_log_not_found' };
  }

  const mappedStatus = mapTumiziEventToOrderPaymentStatus(event, tumiziStatus);
  const orderPaymentStatus =
    event === 'partner.refund.updated' && mappedStatus !== 'refunded' ? 'paid' : mappedStatus;

  const metadata = (paymentLog.metadata ?? {}) as Record<string, unknown>;
  const orderId = typeof metadata.order_id === 'string' ? metadata.order_id : undefined;

  let previousPaymentStatus: string | null = null;
  let orderDepositInfo: { deposit_amount: unknown; balance_amount: unknown } | null = null;
  if (orderId) {
    const existingOrder = await prisma.orders.findFirst({
      where: { id: orderId, tenant_id: tenantId },
      select: { payment_status: true, deposit_amount: true, balance_amount: true },
    });
    previousPaymentStatus = existingOrder?.payment_status ?? null;
    orderDepositInfo = existingOrder
      ? { deposit_amount: existingOrder.deposit_amount, balance_amount: existingOrder.balance_amount }
      : null;
  }

  await prisma.payment_logs.update({
    where: { id: paymentLog.id },
    data: {
      status: mappedStatus === 'paid' || mappedStatus === 'refunded' ? 'completed' : mappedStatus,
      transaction_id: transactionReference || paymentLog.transaction_id,
      metadata: {
        ...metadata,
        tumizi_event: event ?? metadata.tumizi_event,
        tumizi_status: tumiziStatus ?? metadata.tumizi_status,
        tumizi_synced_at: new Date().toISOString(),
        ...(rawPayload !== undefined ? { tumizi_payload: rawPayload } : {}),
      } as any,
    },
  });

  let effectiveOrderPaymentStatus: 'paid' | 'pending' | 'failed' | 'refunded' | 'deposit_paid' =
    orderPaymentStatus;
  const skipOrderUpdate = shouldSkipTumiziOrderPaymentDowngrade(
    previousPaymentStatus,
    orderPaymentStatus,
  );

  if (orderId) {
    if (skipOrderUpdate) {
      // Preserve whatever the order genuinely already was (could be 'paid'
      // OR 'deposit_paid' — see shouldSkipTumiziOrderPaymentDowngrade)
      // rather than blindly promoting to 'paid'.
      effectiveOrderPaymentStatus =
        (previousPaymentStatus as typeof effectiveOrderPaymentStatus) ?? 'paid';
    } else {
      // Basic deposit support (docs/SERVICES_PLAN.md) — a Tumizi 'paid'
      // confirmation might be the deposit leg or a later balance
      // settlement; resolve which against what was actually requested at
      // initiation (payment_logs.amount), never anything from the webhook
      // payload itself.
      effectiveOrderPaymentStatus = resolveTumiziOrderPaymentStatus(
        orderPaymentStatus,
        orderDepositInfo,
        paymentLog.amount,
      );
      await prisma.orders.updateMany({
        where: { id: orderId, tenant_id: tenantId },
        data: {
          payment_status: effectiveOrderPaymentStatus,
          transaction_id: transactionReference || paymentLog.transaction_id,
          payment_gateway: 'tumizi',
        },
      });
    }

    if (
      !skipOrderUpdate &&
      previousPaymentStatus &&
      previousPaymentStatus !== effectiveOrderPaymentStatus
    ) {
      const order = await prisma.orders.findFirst({
        where: { id: orderId, tenant_id: tenantId },
        include: {
          order_products: {
            include: {
              products: { select: { id: true, name: true, image: true } },
            },
          },
        },
      });
      const tenant = await prisma.tenants.findUnique({ where: { id: tenantId } });
      if (order && tenant) {
        sendPaymentStatusUpdateEmail({
          order: order as any,
          tenant: tenant as any,
          oldPaymentStatus: previousPaymentStatus,
          newPaymentStatus: effectiveOrderPaymentStatus,
        }).catch((error: unknown) => {
          console.error('[Tumizi] payment status email failed:', error);
        });
      }
    }
  }

  return {
    applied: true,
    orderId,
    paymentStatus: effectiveOrderPaymentStatus,
    previousPaymentStatus,
  };
}
