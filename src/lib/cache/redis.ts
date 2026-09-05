/**
 * In-memory cache utility for local/testing usage.
 *
 * We keep the same cache API so callers do not need to change while
 * remote cache infrastructure is disabled.
 */

// In-memory cache store
const memoryCache = new Map<string, { data: unknown; expires: number }>();

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

/**
 * Get value from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const cached = memoryCache.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.data as T;
  }

  // Clean up expired entry
  if (cached) {
    memoryCache.delete(key);
  }

  return null;
}

/**
 * Set value in cache
 */
export async function setCache<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<void> {
  const { ttl = 300 } = options; // Default 5 minutes

  memoryCache.set(key, {
    data: value,
    expires: Date.now() + ttl * 1000,
  });
}

/**
 * Delete value from cache
 */
export async function deleteCache(key: string): Promise<void> {
  memoryCache.delete(key);
}

/**
 * Delete multiple keys matching a pattern from memory cache.
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  // Convert glob pattern to regex (e.g., "products:123:*" -> /^products:123:.*$/)
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);
  
  // Clear memory cache matching pattern
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  }
  
}

/**
 * Get or set cache value (cache-aside pattern)
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try to get from cache
  const cached = await getCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  await setCache(key, data, options);

  return data;
}

/**
 * Invalidate cache by tag (if using tags)
 */
export async function invalidateCacheByTag(tag: string): Promise<void> {
  // Placeholder for future tag-aware cache implementation.
  console.warn('Cache tag invalidation not yet implemented');
}

/**
 * Clear all cache (use with caution)
 */
export async function clearAllCache(): Promise<void> {
  memoryCache.clear();
}

/**
 * Cache key helpers for consistent naming
 */
export const cacheKeys = {
  // Tenant cache
  tenant: (hostname: string) => `tenant:${hostname}`,
  tenantById: (tenantId: string) => `tenant:id:${tenantId}`,

  // Products cache
  productsList: (tenantId: string, params: string) => `products:${tenantId}:list:${params}`,
  productDetail: (tenantId: string, productId: string) => `products:${tenantId}:${productId}`,
  productsSearch: (tenantId: string, query: string) => `products:${tenantId}:search:${query}`,

  // Orders cache
  ordersList: (tenantId: string, params: string) => `orders:${tenantId}:list:${params}`,
  orderDetail: (tenantId: string, orderId: string) => `orders:${tenantId}:${orderId}`,
  recentOrders: (tenantId: string) => `orders:${tenantId}:recent`,

  // Analytics cache
  analyticsOverview: (tenantId: string, dateRange: string) => `analytics:${tenantId}:overview:${dateRange}`,
  analyticsRevenue: (tenantId: string, params: string) => `analytics:${tenantId}:revenue:${params}`,
  analyticsSales: (tenantId: string, params: string) => `analytics:${tenantId}:sales:${params}`,

  // Cart cache
  cart: (tenantId: string, customerId: string) => `cart:${tenantId}:${customerId}`,
  cartCount: (tenantId: string, customerId: string) => `cart:${tenantId}:${customerId}:count`,

  // Price plans cache
  pricePlans: () => 'price_plans:active',
  pricePlan: (planId: string) => `price_plan:${planId}`,
};

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  SHORT: 60, // 1 minute (Next.js cache)
  MEDIUM: 300, // 5 minutes (products list)
  LONG: 3600, // 1 hour (product detail)
  VERY_LONG: 86400, // 24 hours (static data)
  PRODUCTS_LIST: 300, // 5 minutes (products listing)
  PRODUCT_DETAIL: 3600, // 1 hour (single product)
} as const;

