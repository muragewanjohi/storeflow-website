/**
 * Redis Cache Utility (Upstash Redis)
 * 
 * Provides a unified caching interface using Upstash Redis for production
 * and in-memory cache for development.
 * 
 * Day 38: Performance Optimization
 * Phase 2: Updated to use @upstash/redis SDK
 */

import { Redis } from '@upstash/redis';

// In-memory cache fallback for development
const memoryCache = new Map<string, { data: unknown; expires: number }>();

// Initialize Upstash Redis client (reads from environment variables automatically)
let redisClient: Redis | null = null;

try {
  // Redis.fromEnv() automatically reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
  // Falls back gracefully if environment variables are not set
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = Redis.fromEnv();
    console.log('[Cache] Upstash Redis initialized successfully');
  } else {
    console.warn('[Cache] Upstash Redis not configured (missing env vars), using in-memory cache');
  }
} catch (error) {
  // If environment variables are not set, redisClient will be null
  // This is expected in development - we'll use in-memory cache instead
  console.warn('[Cache] Upstash Redis initialization failed, using in-memory cache:', error);
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

/**
 * Get value from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  // Try Upstash Redis first (production)
  if (redisClient) {
    try {
      const value = await redisClient.get<T>(key);
      if (value !== null) {
        return value;
      }
    } catch (error) {
      console.warn('Redis cache get error (falling back to memory):', error);
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

  // Try Upstash Redis first (production)
  if (redisClient) {
    try {
      if (ttl > 0) {
        await redisClient.set(key, value, { ex: ttl });
      } else {
        await redisClient.set(key, value);
      }
    } catch (error) {
      console.warn('Redis cache set error (falling back to memory):', error);
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
  // Try Upstash Redis first
  if (redisClient) {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.warn('Redis cache delete error:', error);
    }
  }

  // Also delete from memory cache
  memoryCache.delete(key);
}

/**
 * Delete multiple keys matching a pattern
 * 
 * Note: Vercel KV doesn't support pattern deletion directly.
 * This function:
 * 1. Clears memory cache matching the pattern (development)
 * 2. For production, we'd need to track keys or use a different strategy
 * 
 * For now, this works for memory cache and logs a warning for KV.
 * Future improvement: Implement key tracking system for pattern deletion in KV.
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
  
  // For Upstash Redis, we can't delete by pattern directly via REST API
  // In production, this would need a key tracking system or SCAN command
  // For now, we log a warning and rely on TTL expiration
  if (redisClient) {
    // Upstash Redis limitation: Pattern deletion not supported via REST API
    // Keys will expire naturally based on TTL
    // Future: Implement key tracking or use SCAN for pattern-based deletion
    console.warn(`[Cache] Pattern deletion for "${pattern}" - Upstash Redis doesn't support pattern deletion via REST API. Keys will expire based on TTL.`);
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
  SHORT: 60, // 1 minute (Next.js cache)
  MEDIUM: 300, // 5 minutes (Redis - products list)
  LONG: 3600, // 1 hour (Redis - product detail)
  VERY_LONG: 86400, // 24 hours (static data)
  PRODUCTS_LIST: 300, // 5 minutes (products listing)
  PRODUCT_DETAIL: 3600, // 1 hour (single product)
} as const;

