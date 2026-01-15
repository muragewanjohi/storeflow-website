# Upstash Redis Plan Selection Guide

## Overview

This guide helps you choose the right Upstash Redis plan for Phase 2 product caching based on your expected user base, traffic patterns, and caching requirements.

## Plan Comparison & Monthly Costs

| Plan | Storage | Bandwidth | Monthly Cost (1 region) | Monthly Cost (+1 read region) | Best For |
|------|---------|-----------|------------------------|------------------------------|----------|
| **Free** | Limited | Limited | **$0** | N/A | Development & Testing |
| **Pay As You Go** | Unlimited* | Unlimited* | **$0.20 per 100K commands** | Same | Bursting/Unpredictable Traffic |
| **Fixed 250MB** | 250MB | 50GB | **$10** | **$15** | Small Stores (100-500 users) |
| **Fixed 1GB** | 1GB | 100GB | **$20** | **$30** | Growing Stores (500-2,000 users) |
| **Fixed 5GB** | 5GB | 500GB | **$100** | **$150** | Medium Stores (2,000-10,000 users) |
| **Fixed 10GB** | 10GB | 1TB | **$200** | **$300** | Large Stores (10,000-50,000 users) |
| **Fixed 50GB** | 50GB | 5TB | **$400** | **$600** | Very Large Stores (50,000-200,000 users) |
| **Fixed 100GB** | 100GB | 10TB | **$800** | **$1,200** | Enterprise (200,000-500,000 users) |
| **Fixed 500GB** | 500GB | 20TB | **$1,500** | **$2,250** | Mega Enterprise (500,000+ users) |

*Unlimited with usage-based pricing

## Detailed Plan Analysis

### 1. Free Plan - $0/month

**Storage**: Limited (1 database per account)  
**Bandwidth**: Limited  
**Estimated Users**: 10-50 active users (development/testing only)

**Use Case**:
- ✅ Local development
- ✅ Testing Phase 2 implementation
- ✅ Learning/experimentation
- ❌ **NOT for production**

**Monthly Cost**: **$0**

**Recommendation**: Use this to test Phase 2 setup, then upgrade before going to production.

---

### 2. Pay As You Go - Variable Cost

**Pricing**: $0.20 per 100,000 commands  
**Storage**: Unlimited (usage-based)  
**Bandwidth**: Unlimited (usage-based)  
**Estimated Users**: Variable (depends on command volume)

**Cost Calculation Examples**:
- **1M commands/month**: $2.00/month
- **5M commands/month**: $10.00/month
- **10M commands/month**: $20.00/month
- **50M commands/month**: $100.00/month
- **100M commands/month**: $200.00/month

**Command Volume Estimates** (for e-commerce caching):
- **Per product page load**: ~3-5 commands (GET products list, GET count, GET ratings)
- **Per product update**: ~5-10 commands (SET operations, cache invalidation)
- **1,000 page views/day**: ~3,000-5,000 commands/day = ~90K-150K commands/month
- **10,000 page views/day**: ~30,000-50,000 commands/day = ~900K-1.5M commands/month

**Use Case**:
- ✅ Unpredictable traffic patterns
- ✅ Seasonal spikes (holidays, sales)
- ✅ Early-stage with variable growth
- ⚠️ Requires monitoring to control costs

**Monthly Cost Range**: **$2 - $200+** (depends on traffic)

**Recommendation**: Good for testing production traffic patterns, but consider Fixed plans if traffic is consistent.

---

### 3. Fixed 250MB - $10/month

**Storage**: 250MB  
**Bandwidth**: 50GB/month  
**Estimated Users**: **100-500 active users**

**Storage Capacity**:
- ~25,000 cached product listings (10KB each)
- ~50,000 cache keys (5KB average)
- Suitable for stores with <1,000 products

**Bandwidth Capacity**:
- ~50,000 cache hits/month (1MB average response)
- ~1,600 cache hits/day
- Suitable for low to moderate traffic

**Use Case**:
- ✅ Small e-commerce stores
- ✅ Personal/side projects
- ✅ Stores with limited product catalog
- ✅ Low to moderate traffic

**Monthly Cost**: **$10** (single region) or **$15** (+1 read region)

**Recommendation**: Good starting point for small stores. Easy to upgrade when you outgrow it.

---

### 4. Fixed 1GB - $20/month ⭐ **RECOMMENDED STARTING POINT**

**Storage**: 1GB  
**Bandwidth**: 100GB/month  
**Estimated Users**: **500-2,000 active users**

**Storage Capacity**:
- ~100,000 cached product listings (10KB each)
- ~200,000 cache keys (5KB average)
- Suitable for stores with 1,000-5,000 products

**Bandwidth Capacity**:
- ~100,000 cache hits/month (1MB average response)
- ~3,300 cache hits/day
- Suitable for moderate traffic

**Use Case**:
- ✅ Growing e-commerce stores
- ✅ Stores with expanding product catalogs
- ✅ Moderate consistent traffic
- ✅ Good balance of cost and capacity

**Monthly Cost**: **$20** (single region) or **$30** (+1 read region)

**Recommendation**: **Best starting point for most stores**. Provides good capacity for growth without high cost.

---

### 5. Fixed 5GB - $100/month

**Storage**: 5GB  
**Bandwidth**: 500GB/month  
**Estimated Users**: **2,000-10,000 active users**

**Storage Capacity**:
- ~500,000 cached product listings (10KB each)
- ~1,000,000 cache keys (5KB average)
- Suitable for stores with 5,000-25,000 products

**Bandwidth Capacity**:
- ~500,000 cache hits/month (1MB average response)
- ~16,600 cache hits/day
- Suitable for high traffic

**Use Case**:
- ✅ Established e-commerce stores
- ✅ Large product catalogs
- ✅ High traffic volumes
- ✅ Multiple product categories with filters

**Monthly Cost**: **$100** (single region) or **$150** (+1 read region)

**Recommendation**: Upgrade to this when you consistently hit 1GB storage limits or 100GB bandwidth limits.

---

### 6. Fixed 10GB - $200/month

**Storage**: 10GB  
**Bandwidth**: 1TB/month  
**Estimated Users**: **10,000-50,000 active users**

**Storage Capacity**:
- ~1,000,000 cached product listings (10KB each)
- ~2,000,000 cache keys (5KB average)
- Suitable for stores with 25,000+ products

**Bandwidth Capacity**:
- ~1,000,000 cache hits/month (1MB average response)
- ~33,000 cache hits/day
- Suitable for very high traffic

**Use Case**:
- ✅ Large e-commerce platforms
- ✅ Extensive product catalogs
- ✅ Very high traffic
- ✅ Multiple regions/global presence

**Monthly Cost**: **$200** (single region) or **$300** (+1 read region)

**Recommendation**: For established businesses with significant traffic and product catalogs.

---

### 7. Fixed 50GB - $400/month

**Storage**: 50GB  
**Bandwidth**: 5TB/month  
**Estimated Users**: **50,000-200,000 active users**

**Use Case**:
- ✅ Major e-commerce platforms
- ✅ Enterprise-level stores
- ✅ Massive product catalogs
- ✅ Global traffic

**Monthly Cost**: **$400** (single region) or **$600** (+1 read region)

---

### 8. Fixed 100GB - $800/month

**Storage**: 100GB  
**Bandwidth**: 10TB/month  
**Estimated Users**: **200,000-500,000 active users**

**Use Case**:
- ✅ Enterprise e-commerce
- ✅ Global platforms
- ✅ Extremely high traffic

**Monthly Cost**: **$800** (single region) or **$1,200** (+1 read region)

---

### 9. Fixed 500GB - $1,500/month

**Storage**: 500GB  
**Bandwidth**: 20TB/month  
**Estimated Users**: **500,000+ active users**

**Use Case**:
- ✅ Mega enterprise platforms
- ✅ Social commerce platforms
- ✅ Global marketplaces

**Monthly Cost**: **$1,500** (single region) or **$2,250** (+1 read region)

---

## Recommendation for Your Store

### Phase 2 Implementation Strategy

**For Initial Production Deployment:**

1. **Start with Fixed 1GB ($20/month)**
   - Good capacity for growth
   - Affordable monthly cost
   - Easy to upgrade when needed
   - Suitable for stores with 500-2,000 active users

2. **Monitor Usage for 1-2 Months**
   - Check storage usage in Upstash dashboard
   - Monitor bandwidth consumption
   - Track cache hit rates
   - Watch for approaching limits

3. **Upgrade When Needed**
   - If storage > 800MB consistently → Upgrade to 5GB
   - If bandwidth > 80GB consistently → Upgrade to 5GB
   - If traffic grows significantly → Upgrade to 5GB

### Cost Optimization Tips

1. **Start Small, Scale Up**
   - Begin with Fixed 1GB ($20/month)
   - Upgrade only when you consistently approach limits
   - Upstash allows easy plan upgrades

2. **Monitor Cache Efficiency**
   - Higher cache hit rates = less database load
   - Optimize cache keys to reduce storage
   - Use appropriate TTLs (5min for lists, 1hr for details)

3. **Consider Read Regions**
   - Only add read regions if you have global traffic
   - Single region is sufficient for most stores initially
   - Each additional read region adds 50% to base cost

4. **Pay As You Go Alternative**
   - Consider if traffic is highly unpredictable
   - Monitor command volume carefully
   - Switch to Fixed plan if monthly cost exceeds Fixed plan cost

## Storage & Bandwidth Estimation

### Storage Calculation

For Phase 2 caching, estimate storage needs:

```
Storage = (Product Listings × Avg Size) + (Cache Keys × Overhead)

Example:
- 1,000 products × 10KB = 10MB (product data)
- 10,000 cache keys × 5KB = 50MB (keys + metadata)
- Total: ~60MB (well within 1GB plan)
```

### Bandwidth Calculation

```
Bandwidth = Cache Hits × Average Response Size

Example:
- 100,000 page views/month
- 80% cache hit rate = 80,000 cache hits
- 1MB average response size
- Total: ~80GB/month (within 100GB limit)
```

## Decision Matrix

| Your Situation | Recommended Plan | Monthly Cost |
|----------------|------------------|--------------|
| Just starting, <100 products | **Fixed 1GB** | $20 |
| Growing store, 100-1,000 products | **Fixed 1GB** | $20 |
| Established store, 1,000-5,000 products | **Fixed 5GB** | $100 |
| Large store, 5,000+ products | **Fixed 10GB** | $200 |
| Unpredictable traffic | **Pay As You Go** | $2-200 (variable) |
| Development/Testing | **Free** | $0 |

## Final Recommendation

**For Phase 2 Production Deployment:**

✅ **Start with Fixed 1GB Plan ($20/month)**

**Why:**
- Affordable monthly cost
- Sufficient capacity for most stores (500-2,000 users)
- Easy to upgrade when needed
- Good balance of cost and performance
- Can handle 100GB bandwidth (suitable for moderate traffic)

**When to Upgrade:**
- Storage consistently > 800MB → Upgrade to 5GB
- Bandwidth consistently > 80GB → Upgrade to 5GB
- Active users > 2,000 → Consider 5GB
- Product catalog > 5,000 items → Consider 5GB

**Monthly Cost Summary:**
- **Fixed 1GB**: $20/month (single region) or $30/month (+1 read region)
- **Fixed 5GB**: $100/month (single region) or $150/month (+1 read region)

---

**Status**: Ready for plan selection  
**Last Updated**: January 15, 2026
