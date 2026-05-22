import { prisma } from '@/lib/prisma/client';
import { sendOrderCancelledEmail } from '@/lib/orders/emails';
import { initiateTumiziRefundForOrder } from '@/lib/tumizi/refund-order-payment';
import type { Tenant } from '@/lib/tenant-context';

export type CancelTenantOrderInput = {
  tenantId: string;
  orderId: string;
  reason: string;
  refund?: boolean;
  notes?: string | null;
  userId: string;
};

export type CancelTenantOrderResult = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  updated_at: Date | null;
};

export class CancelOrderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'CancelOrderError';
  }
}

export async function cancelTenantOrder(
  input: CancelTenantOrderInput,
): Promise<CancelTenantOrderResult> {
  const { tenantId, orderId, reason, refund = false, notes, userId } = input;

  const [order, tenant] = await Promise.all([
    prisma.orders.findFirst({
      where: { id: orderId, tenant_id: tenantId },
      include: {
        order_products: {
          include: {
            products: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
    }),
    prisma.tenants.findUnique({ where: { id: tenantId } }),
  ]);

  if (!order) {
    throw new CancelOrderError('Order not found', 404);
  }
  if (!tenant) {
    throw new CancelOrderError('Tenant not found', 404);
  }

  if (order.status === 'cancelled') {
    throw new CancelOrderError('Order is already cancelled', 400);
  }
  if (order.status === 'delivered') {
    throw new CancelOrderError('Cannot cancel a delivered order', 400);
  }
  if (order.status === 'refunded') {
    throw new CancelOrderError('Order has already been refunded', 400);
  }

  const productsWithVariants = new Set<string>();

  for (const item of order.order_products) {
    if (item.variant_id) {
      await prisma.product_variants.update({
        where: { id: item.variant_id },
        data: { stock_quantity: { increment: item.quantity } },
      });
      if (item.product_id) {
        productsWithVariants.add(item.product_id);
      }
    } else if (item.product_id) {
      await prisma.products.update({
        where: { id: item.product_id },
        data: { stock_quantity: { increment: item.quantity } },
      });
    }
  }

  const { syncProductStockFromVariants } = await import('@/lib/inventory/sync-product-stock');
  for (const productId of productsWithVariants) {
    await syncProductStockFromVariants(productId, tenantId);
  }

  const shouldInitiateTumiziRefund =
    refund === true && order.payment_status === 'paid' && order.payment_gateway === 'tumizi';

  if (shouldInitiateTumiziRefund) {
    await initiateTumiziRefundForOrder({
      tenantId,
      order: {
        id: order.id,
        order_number: order.order_number,
        payment_track: order.payment_track,
        transaction_id: order.transaction_id,
      },
      reason,
      userId,
    });
  }

  const updatedOrder = await prisma.orders.update({
    where: { id: orderId },
    data: {
      status: 'cancelled',
      payment_status:
        shouldInitiateTumiziRefund || order.payment_status !== 'paid'
          ? order.payment_status
          : refund
            ? 'refunded'
            : order.payment_status,
      message: notes || order.message,
    },
    include: {
      order_products: {
        include: {
          products: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
  });

  const wasPaymentMade = order.payment_status === 'paid';
  sendOrderCancelledEmail({
    order: updatedOrder as Parameters<typeof sendOrderCancelledEmail>[0]['order'],
    tenant: tenant as Tenant,
    reason,
    refundAmount: refund && wasPaymentMade ? Number(order.total_amount) : undefined,
  }).catch((error) => {
    console.error('Error sending cancellation email:', error);
  });

  return {
    id: updatedOrder.id,
    order_number: updatedOrder.order_number,
    status: updatedOrder.status ?? 'cancelled',
    payment_status: updatedOrder.payment_status ?? 'pending',
    updated_at: updatedOrder.updated_at,
  };
}
