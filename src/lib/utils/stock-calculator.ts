/**
 * Stock Calculation Utility
 * 
 * Helper functions for stock-related calculations in the UI (dashboard).
 * 
 * IMPORTANT: For actual stock management, the database stores the synced values.
 * - When variants exist: product.stock_quantity = sum of variant stocks
 * - When no variants: product.stock_quantity = actual inventory
 * 
 * Sync happens automatically when:
 * - Variant is created/updated/deleted
 * - Order is placed
 * - Inventory is adjusted
 * 
 * See: @/lib/inventory/sync-product-stock.ts
 */

interface VariantWithStock {
  stock_quantity: number | null;
}

interface ProductWithVariants {
  stock_quantity: number | null;
  product_variants?: VariantWithStock[];
}

/**
 * Calculate stock from variants (for UI display in dashboard)
 * Used when showing "calculated from variants" in the edit form
 * 
 * @param product - Product with variants
 * @returns The sum of variant stocks, or product stock if no variants
 */
export function calculateStockFromVariants(product: ProductWithVariants): number {
  if (product.product_variants && product.product_variants.length > 0) {
    return product.product_variants.reduce((sum, variant) => {
      return sum + (variant.stock_quantity ?? 0);
    }, 0);
  }
  return product.stock_quantity ?? 0;
}

/**
 * Check if a product has variants
 * 
 * @param product - Product with optional variants
 * @returns true if the product has variants
 */
export function hasVariants(product: ProductWithVariants): boolean {
  return !!product.product_variants && product.product_variants.length > 0;
}
