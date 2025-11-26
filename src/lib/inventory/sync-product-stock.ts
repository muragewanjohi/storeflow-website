/**
 * Sync Product Stock Helper
 * 
 * When a product has variants, the product-level stock should equal
 * the sum of all variant stocks. This function updates the product
 * stock to match the total variant stock.
 * 
 * This follows Shopify/Amazon best practices where:
 * - When variants exist: Product stock = sum of variant stocks (read-only/calculated)
 * - When no variants exist: Product stock is the actual inventory
 */

import { prisma } from '@/lib/prisma/client';

/**
 * Sync product-level stock to match the sum of all variant stocks
 * @param productId - The product ID to sync
 * @param tenantId - The tenant ID for security
 */
export async function syncProductStockFromVariants(
  productId: string,
  tenantId: string
): Promise<void> {
  // Check if product has variants
  const variantCount = await prisma.product_variants.count({
    where: {
      product_id: productId,
      tenant_id: tenantId,
    },
  });

  // Only sync if variants exist
  if (variantCount === 0) {
    return; // No variants, product stock is independent
  }

  // Calculate sum of all variant stocks
  const variantStocks = await prisma.product_variants.aggregate({
    where: {
      product_id: productId,
      tenant_id: tenantId,
    },
    _sum: {
      stock_quantity: true,
    },
  });

  const totalVariantStock = variantStocks._sum.stock_quantity || 0;

  // Update product-level stock to match sum of variant stocks
  await prisma.products.update({
    where: { id: productId },
    data: {
      stock_quantity: totalVariantStock,
    },
  });
}

