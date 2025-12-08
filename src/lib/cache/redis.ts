/**
 * Redis Cache Utility (Vercel KV)
 * 
 * Provides a unified caching interface using Vercel KV (Redis) for production
 * and in-memory cache for development.
 * 
 * Day 38: Performance Optimization
 */

import { kv } from '@vercel/kv';

// In-memory cache fallback for development
const memoryCache = new Map<string, { data: unknown; expires: number }>();

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

/**
 * Get value from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  // Try Vercel KV first (production)
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const value = await kv.get<T>(key);
      if (value !== null) {
        return value;
      }
    } catch (error) {
      console.warn('KV cache get error (falling back to memory):', error);
      // Fall through to memory cache
    }
  }

  // Fallback to memory cache (development)
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

  // Try Vercel KV first (production)
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      if (ttl > 0) {
        await kv.set(key, value, { ex: ttl });
      } else {
        await kv.set(key, value);
      }
    } catch (error) {
      console.warn('KV cache set error (falling back to memory):', error);
      // Fall through to memory cache
    }
  }

  // Fallback to memory cache (development)
  memoryCache.set(key, {
    data: value,
    expires: Date.now() + ttl * 1000,
  });
}

/**
 * Delete value from cache
 */
export async function deleteCache(key: string): Promise<void> {
  // Try Vercel KV first
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      await kv.del(key);
    } catch (error) {
      console.warn('KV cache delete error:', error);
    }
  }

  // Also delete from memory cache
  memoryCache.delete(key);
}

/**
 * Delete multiple keys matching a pattern
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  // Vercel KV doesn't support pattern deletion directly
  // We'll need to track keys or use tags
  // For now, just clear memory cache matching pattern
  const regex = new RegExp(pattern);
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
  // Vercel KV doesn't support tags natively
  // This is a placeholder for future implementation
  // For now, we'll need to track tag-to-key mappings
  console.warn('Cache tag invalidation not yet implemented');
}

/**
 * Clear all cache (use with caution)
 */
export async function clearAllCache(): Promise<void> {
  // Clear memory cache
  memoryCache.clear();

  // Note: Vercel KV doesn't support clearing all keys
  // You'd need to track keys or use a namespace prefix
  console.warn('Vercel KV does not support clearing all keys');
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
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

