/**
 * Product Cache Key Generator
 * 
 * Generates consistent cache keys for product-related queries
 * Supports cache invalidation patterns
 */

import { createHash } from 'crypto';

/**
 * Generate a hash from an object for consistent cache keys
 */
function hashObject(obj: Record<string, any>): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  return createHash('md5').update(str).digest('hex').substring(0, 8);
}

/**
 * Generate cache key for products list query
 */
export function getProductsListCacheKey(
  tenantId: string,
  params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    category_id?: string;
    brand_id?: string;
    min_price?: number;
    max_price?: number;
    in_stock?: boolean;
    sort_by?: string;
    sort_order?: string;
    [key: string]: any; // For attribute filters (attr_*)
  }
): string {
  // Normalize parameters
  const normalizedParams = {
    page: params.page || 1,
    limit: params.limit || 20,
    search: params.search || null,
    status: params.status || null,
    category_id: params.category_id || null,
    brand_id: params.brand_id || null,
    min_price: params.min_price ?? null,
    max_price: params.max_price ?? null,
    in_stock: params.in_stock ?? null,
    sort_by: params.sort_by || 'created_at',
    sort_order: params.sort_order || 'desc',
  };

  // Extract attribute filters (attr_*)
  const attributeFilters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith('attr_')) {
      const attributeId = key.replace('attr_', '');
      const valueIds = Array.isArray(value) ? value : String(value).split(',').filter(id => id.trim());
      if (valueIds.length > 0) {
        attributeFilters[attributeId] = valueIds.sort();
      }
    }
  }

  // Create a stable hash of all filters
  const filterHash = hashObject({
    ...normalizedParams,
    attributes: Object.keys(attributeFilters).length > 0 ? attributeFilters : null,
  });

  return `products:${tenantId}:list:${filterHash}`;
}

/**
 * Generate cache key for product count query
 */
export function getProductsCountCacheKey(
  tenantId: string,
  whereClause: Record<string, any>
): string {
  // Create a stable hash of the where clause
  const whereHash = hashObject(whereClause);
  return `products:${tenantId}:count:${whereHash}`;
}

/**
 * Generate cache key for product detail
 */
export function getProductDetailCacheKey(
  tenantId: string,
  productId: string
): string {
  return `products:${tenantId}:detail:${productId}`;
}

/**
 * Generate cache key pattern for invalidating all product caches for a tenant
 */
export function getProductsCachePattern(tenantId: string): string {
  return `products:${tenantId}:*`;
}

/**
 * Generate cache key for product rating stats
 */
export function getProductRatingStatsCacheKey(
  tenantId: string,
  productIds: string[]
): string {
  // Sort product IDs for consistent hashing
  const sortedIds = [...productIds].sort();
  const idsHash = hashObject({ ids: sortedIds });
  return `products:${tenantId}:ratings:${idsHash}`;
}
