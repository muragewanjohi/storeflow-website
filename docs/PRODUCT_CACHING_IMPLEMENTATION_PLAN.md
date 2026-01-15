# Product Caching Implementation Plan

## Overview

This plan implements multi-layer caching for products to eliminate database queries on page loads, following Vercel and e-commerce best practices.

## Current State

### What We Have
- ✅ `@vercel/kv` package installed
- ✅ Redis cache utility (`src/lib/cache/redis.ts`)
- ✅ Cache key helpers (`cacheKeys.productsList()`)
- ✅ HTTP/CDN caching (30s cache, 60s stale-while-revalidate)
- ❌ Products API doesn't use Redis cache (only HTTP headers)
- ❌ No Next.js Data Cache integration

### Current Flow
```
User Request → API Route → Database Query → HTTP Cache → Response
```

## Target Architecture

### Multi-Layer Caching Strategy

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Next.js Data Cache (unstable_cache)           │
│ - Server-side, request-level cache                     │
│ - Fastest for repeated requests                        │
│ - TTL: 60 seconds                                      │
└─────────────────────────────────────────────────────────┘
                    ↓ (cache miss)
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Redis Cache (Vercel KV)                       │
│ - Distributed cache across all serverless functions    │
│ - Shared across all edge regions                       │
│ - TTL: 5 minutes (MEDIUM)                             │
└─────────────────────────────────────────────────────────┘
                    ↓ (cache miss)
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Database Query                                │
│ - Prisma queries                                       │
│ - Only when cache misses                               │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 4: HTTP/CDN Cache                                │
│ - Browser/CDN caching                                  │
│ - TTL: 30 seconds                                      │
└─────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Next.js Data Cache (Recommended for Vercel)

**Why Next.js `unstable_cache`?**
- ✅ Optimized for Vercel's serverless architecture
- ✅ Request-level deduplication (same request = one DB query)
- ✅ Works seamlessly with Next.js App Router
- ✅ No additional infrastructure needed
- ✅ Automatic cache invalidation on revalidation

**Implementation:**

1. **Update Products API Route**
   - Wrap database queries with `unstable_cache`
   - Cache key includes: tenant_id, page, limit, sort_by, sort_order, filters
   - TTL: 60 seconds (short, for real-time updates)

2. **Cache Key Strategy**
   ```typescript
   // Example cache key
   `products:${tenantId}:page:${page}:limit:${limit}:sort:${sortBy}:${sortOrder}:filters:${filterHash}`
   ```

3. **Benefits**
   - Same request parameters = instant response (no DB query)
   - Automatic deduplication during page load
   - Works across all Vercel regions

### Phase 2: Redis Cache Layer (Vercel KV)

**Why Redis?**
- ✅ Shared cache across all serverless functions
- ✅ Persists across deployments
- ✅ Longer TTL for less frequently changing data
- ✅ Already have infrastructure in place

**Implementation:**

1. **Update Products API Route**
   - Use `getOrSetCache()` from existing utility
   - Cache key: `cacheKeys.productsList(tenantId, paramsHash)`
   - TTL: 5 minutes (MEDIUM)

2. **Cache Invalidation**
   - Invalidate on product create/update/delete
   - Pattern: `products:${tenantId}:*`
   - Use cache tags for selective invalidation

### Phase 3: Hybrid Approach (Best Performance)

**Combine Both Layers:**

```typescript
// Pseudo-code
async function getProducts(params) {
  // Layer 1: Next.js Data Cache (60s)
  return unstable_cache(
    async () => {
      // Layer 2: Redis Cache (5min)
      return getOrSetCache(
        cacheKey,
        async () => {
          // Layer 3: Database Query
          return fetchFromDatabase();
        },
        { ttl: CACHE_TTL.MEDIUM }
      );
    },
    [cacheKey],
    { revalidate: 60 }
  )();
}
```

## Detailed Implementation Steps

### Step 1: Update Products API Route

**File:** `src/app/api/products/route.ts`

**Changes:**
1. Import `unstable_cache` from `next/cache`
2. Import `getOrSetCache`, `cacheKeys`, `CACHE_TTL` from cache utility
3. Wrap database queries with caching
4. Create cache key from query parameters
5. Add cache invalidation on product mutations

### Step 2: Create Cache Key Generator

**File:** `src/lib/cache/product-cache-keys.ts` (new)

**Purpose:**
- Generate consistent cache keys
- Hash complex filter parameters
- Support cache invalidation patterns

### Step 3: Cache Invalidation Strategy

**When to Invalidate:**
- Product created/updated/deleted
- Category changes (if filtering by category)
- Price changes (if sorting by price)
- Stock changes (if filtering by stock)

**Implementation:**
- Add invalidation calls in product mutation routes
- Use pattern-based deletion for related caches

### Step 4: Update Cache TTL Constants

**File:** `src/lib/cache/redis.ts`

**Add Product-Specific TTLs:**
```typescript
export const CACHE_TTL = {
  SHORT: 60,           // 1 minute (Next.js cache)
  MEDIUM: 300,         // 5 minutes (Redis - products list)
  LONG: 3600,          // 1 hour (Redis - product detail)
  VERY_LONG: 86400,    // 24 hours (static data)
  PRODUCTS_LIST: 300,  // 5 minutes (products listing)
  PRODUCT_DETAIL: 3600, // 1 hour (single product)
} as const;
```

## Performance Expectations

### Before (Current)
- Every page load: 2 DB queries (findMany + count)
- Sort change: 2 DB queries
- Page change: 2 DB queries
- **Database load:** High

### After (With Caching)
- First page load: 2 DB queries → cached
- Same page within 60s: 0 DB queries (Next.js cache)
- Same page within 5min: 0 DB queries (Redis cache)
- **Database load:** Reduced by ~80-90%

### Cache Hit Rates (Expected)
- **Popular pages (page 1, popular sort):** 90%+ hit rate
- **Common filters:** 70-80% hit rate
- **Rare combinations:** 30-50% hit rate

## Vercel-Specific Considerations

### 1. Serverless Function Limits
- ✅ Cache reduces execution time
- ✅ Cache reduces database connections
- ⚠️ Monitor KV usage (Vercel KV has limits)

### 2. Edge Caching
- HTTP cache headers still work
- CDN caching at edge locations
- Combine with Next.js cache for best results

### 3. Cost Optimization
- Redis cache reduces database query costs
- Lower serverless function execution time
- Better user experience = lower bounce rate

## Implementation Checklist

### Phase 1: Next.js Data Cache
- [ ] Import `unstable_cache` in products API route
- [ ] Wrap `prisma.products.findMany()` with cache
- [ ] Wrap `prisma.products.count()` with cache
- [ ] Create cache key generator function
- [ ] Test cache hit/miss behavior
- [ ] Verify cache invalidation works

### Phase 2: Redis Cache Layer
- [ ] Use `getOrSetCache()` for products list
- [ ] Use `getOrSetCache()` for product count
- [ ] Update cache key helpers
- [ ] Test Redis cache in production
- [ ] Monitor cache hit rates

### Phase 3: Cache Invalidation
- [ ] Add invalidation on product create
- [ ] Add invalidation on product update
- [ ] Add invalidation on product delete
- [ ] Add invalidation on category changes
- [ ] Test invalidation flow

### Phase 4: Monitoring & Optimization
- [ ] Add cache hit/miss logging
- [ ] Monitor cache performance
- [ ] Adjust TTL based on usage patterns
- [ ] Optimize cache keys for better hit rates

## Testing Strategy

### 1. Unit Tests
- Test cache key generation
- Test cache hit/miss logic
- Test cache invalidation

### 2. Integration Tests
- Test API route with cache
- Test cache persistence
- Test cache expiration

### 3. Performance Tests
- Measure response times
- Compare DB query counts
- Monitor cache hit rates

## Rollout Plan

### Step 1: Development
- Implement Next.js cache first (lowest risk)
- Test locally
- Verify cache behavior

### Step 2: Staging
- Deploy to staging environment
- Monitor cache performance
- Test cache invalidation

### Step 3: Production (Gradual)
- Enable for 10% of requests (feature flag)
- Monitor database load reduction
- Gradually increase to 100%

## Monitoring & Metrics

### Key Metrics to Track
1. **Cache Hit Rate:** % of requests served from cache
2. **Database Query Reduction:** Queries saved per hour
3. **Response Time:** Average API response time
4. **Cache Size:** Memory/Redis usage
5. **Error Rate:** Cache-related errors

### Tools
- Vercel Analytics
- Vercel KV metrics
- Database query logs
- Custom logging in API routes

## Risk Mitigation

### Potential Issues
1. **Stale Data:** Products updated but cache not invalidated
   - **Solution:** Comprehensive invalidation strategy
   - **Fallback:** Shorter TTL for critical data

2. **Cache Stampede:** Many requests miss cache simultaneously
   - **Solution:** Next.js request deduplication
   - **Fallback:** Staggered cache expiration

3. **Memory Limits:** Too much cached data
   - **Solution:** Limit cache size per tenant
   - **Fallback:** LRU eviction policy

## Success Criteria

### Performance Goals
- ✅ 80%+ cache hit rate for popular pages
- ✅ 50%+ reduction in database queries
- ✅ <100ms response time for cached requests
- ✅ Zero cache-related errors

### Business Goals
- ✅ Faster page loads
- ✅ Better user experience
- ✅ Lower database costs
- ✅ Higher conversion rates

## Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Start with Phase 1** - Implement Next.js cache (safest, fastest)
3. **Monitor results** - Measure performance improvements
4. **Add Phase 2** - Implement Redis layer if needed
5. **Optimize** - Adjust TTL and cache keys based on usage

## References

- [Next.js Data Cache](https://nextjs.org/docs/app/building-your-application/caching#data-cache)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [E-commerce Caching Best Practices](https://vercel.com/blog/caching-strategies)
