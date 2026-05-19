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

export function extractTumiziCustomerPaymentStatus(response: Record<string, unknown>): {
  status?: string;
  transactionReference?: string;
} {
  const data = toObject(response.data ?? response);
  return {
    status: readString(data, 'status') ?? readString(response, 'status'),
    transactionReference: readString(
      data,
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

export type ApplyTumiziPaymentResult = {
  applied: boolean;
  orderId?: string;
  paymentStatus?: 'paid' | 'pending' | 'failed' | 'refunded';
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
  if (orderId) {
    const existingOrder = await prisma.orders.findFirst({
      where: { id: orderId, tenant_id: tenantId },
      select: { payment_status: true },
    });
    previousPaymentStatus = existingOrder?.payment_status ?? null;
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

  if (orderId) {
    await prisma.orders.updateMany({
      where: { id: orderId, tenant_id: tenantId },
      data: {
        payment_status: orderPaymentStatus,
        transaction_id: transactionReference || paymentLog.transaction_id,
        payment_gateway: 'tumizi',
      },
    });

    if (
      previousPaymentStatus &&
      previousPaymentStatus !== orderPaymentStatus
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
          newPaymentStatus: orderPaymentStatus,
        }).catch((error: unknown) => {
          console.error('[Tumizi] payment status email failed:', error);
        });
      }
    }
  }

  return {
    applied: true,
    orderId,
    paymentStatus: orderPaymentStatus,
    previousPaymentStatus,
  };
}
