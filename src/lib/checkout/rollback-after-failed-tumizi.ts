import { prisma } from '@/lib/prisma/client';
import { syncProductStockFromVariants } from '@/lib/inventory/sync-product-stock';

export async function rollbackCheckoutAfterFailedTumizi(params: {
  tenantId: string;
  orderId: string;
  orderItems: Array<{ product_id: string; variant_id: string | null; quantity: number }>;
  // Real scheduling/booking (S2, docs/SERVICES_PLAN.md) — any bookings
  // tentatively reserved for this now-aborted checkout. Cancelled (never
  // hard-deleted, matching the codebase's soft-cancel convention), freeing
  // the capacity they held back up. `orders.delete` below would also
  // null out their order_id via ON DELETE SET NULL either way, but
  // leaving them 'pending' with no order would misleadingly still occupy
  // real capacity for that slot.
  bookingIds?: string[];
}): Promise<void> {
  const { tenantId, orderId, orderItems, bookingIds } = params;
  const productsWithVariants = new Set<string>();

  if (bookingIds && bookingIds.length > 0) {
    await prisma.service_bookings.updateMany({
      where: { id: { in: bookingIds }, tenant_id: tenantId },
      data: { status: 'cancelled' },
    });
  }

  for (const item of orderItems) {
    if (item.variant_id) {
      await prisma.product_variants.update({
        where: { id: item.variant_id },
        data: {
          stock_quantity: {
            increment: item.quantity,
          },
        },
      });
      productsWithVariants.add(item.product_id);
    } else {
      await prisma.products.update({
        where: { id: item.product_id },
        data: {
          stock_quantity: {
            increment: item.quantity,
          },
        },
      });
    }
  }

  for (const productId of productsWithVariants) {
    await syncProductStockFromVariants(productId, tenantId);
  }

  await prisma.orders.delete({
    where: { id: orderId, tenant_id: tenantId },
  });
}
