import { prisma } from '@/lib/prisma/client';
import { syncProductStockFromVariants } from '@/lib/inventory/sync-product-stock';

export async function rollbackCheckoutAfterFailedTumizi(params: {
  tenantId: string;
  orderId: string;
  orderItems: Array<{ product_id: string; variant_id: string | null; quantity: number }>;
}): Promise<void> {
  const { tenantId, orderId, orderItems } = params;
  const productsWithVariants = new Set<string>();

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
