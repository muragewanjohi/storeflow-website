# Vercel KV Setup Guide for Phase 2

## Overview

Vercel KV is no longer a direct first-party storage product. It's now available through the **Vercel Marketplace** as Redis integrations. This guide will help you set up Redis caching for Phase 2.

## Step-by-Step Setup

### Option 1: Upstash Redis (Recommended)

1. **Go to Vercel Dashboard**
   - Navigate to your project
   - Click on **"Storage"** tab (or go to Marketplace)

2. **Access Marketplace**
   - Click **"Browse Storage"** or **"Add Integration"**
   - Select **"Marketplace Database Providers"** tab
   - Look for **"Upstash"** (shows "Serverless DB (Redis, Vector, Queue, Search)")

3. **Set Up Upstash**
   - Click on **"Upstash for Redis"** (red circular icon - NOT Vector, QStash, or Search)
   - Click **"Create"** button
   - Follow the setup wizard:
     - Create a new Upstash account (if needed)
     - **Select a plan** (see `UPSTASH_REDIS_PLAN_SELECTION.md` for recommendations)
     - Create a new Redis database
     - Select a region close to your Vercel functions
     - **Connect it to your Vercel project**

4. **Configure Custom Prefix (IMPORTANT!)**
   - When you see the "Connect Project" dialog:
     - **Custom Prefix**: Change from `STORAGE` to **`UPSTASH_REDIS_REST`**
     - This will create environment variables:
       - `UPSTASH_REDIS_REST_URL`
       - `UPSTASH_REDIS_REST_TOKEN`
     - ✅ **Select all environments**: Development, Preview, and Production (all checked)
   - Click **"Continue"** to complete the connection

5. **Verify Environment Variables**
   - After setup, Vercel will automatically add these environment variables:
     - `UPSTASH_REDIS_REST_URL` ✅ (if you used prefix `UPSTASH_REDIS_REST`)
     - `UPSTASH_REDIS_REST_TOKEN` ✅ (if you used prefix `UPSTASH_REDIS_REST`)
   - **Note**: If you used a different prefix, the variables will be:
     - `{YOUR_PREFIX}_URL`
     - `{YOUR_PREFIX}_TOKEN`
   - Our code supports both `UPSTASH_REDIS_REST_*` and `KV_REST_API_*` variable names

### Option 2: Redis (Standalone)

1. **Go to Marketplace**
   - Navigate to **"Storage"** → **"Browse Storage"**
   - Select **"Marketplace Database Providers"** tab
   - Look for **"Redis"** (shows "Serverless Redis")

2. **Set Up Redis**
   - Click on **"Redis"**
   - Follow the setup wizard
   - Connect to your Vercel project

3. **Get Environment Variables**
   - Environment variables will be automatically added to your project

## Update Code for Upstash (If Needed)

If you use Upstash, you may need to update the Redis cache utility to use Upstash's SDK instead of `@vercel/kv`. However, our current implementation should work with Upstash's REST API if the environment variables are named correctly.

### Current Implementation

Our code in `src/lib/cache/redis.ts` checks for:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

### If Upstash Uses Different Variable Names

If Upstash provides different environment variable names (like `UPSTASH_REDIS_REST_URL`), you can either:

1. **Option A: Use Vercel Environment Variables**
   - In Vercel Dashboard → Project Settings → Environment Variables
   - Add aliases:
     - `KV_REST_API_URL` = `UPSTASH_REDIS_REST_URL`
     - `KV_REST_API_TOKEN` = `UPSTASH_REDIS_REST_TOKEN`

2. **Option B: Update the Code**
   - Modify `src/lib/cache/redis.ts` to check for both variable names
   - See example below

## Code Update (If Needed)

If your Redis provider uses different environment variable names, update `src/lib/cache/redis.ts`:

```typescript
// Get environment variables (support both Vercel KV and Upstash naming)
const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Then use kvUrl and kvToken instead of direct env access
if (kvUrl && kvToken) {
  // ... rest of the code
}
```

## Verify Setup

1. **Check Environment Variables**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are present
   - Or verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

2. **Test the Cache**
   - Deploy your code
   - Check Vercel logs for cache-related messages
   - Look for: `KV cache get error` or successful cache operations

3. **Monitor Cache Performance**
   - Check your Redis provider's dashboard
   - Monitor cache hit rates
   - Check for any errors

## Important Notes

1. **Marketplace Integration**
   - KV is no longer in the "Storage" tab as a first-party product
   - It's now in the Marketplace under "Marketplace Database Providers"

2. **Provider Choice**
   - **Upstash**: Popular choice, serverless Redis, good Vercel integration
   - **Redis**: Direct Redis provider, also serverless
   - Both should work with our implementation

3. **Environment Variables**
   - The integration should automatically add environment variables
   - If not, check the provider's documentation for the exact variable names

4. **Fallback Behavior**
   - Our code already has fallback to in-memory cache
   - If Redis isn't configured, it will use memory cache (development mode)
   - This ensures the app works even without Redis setup

## Troubleshooting

### Issue: Can't find KV in Storage tab
**Solution**: Go to Marketplace → Database Providers → Look for Redis/Upstash

### Issue: Environment variables not set
**Solution**: 
- Check if integration was completed
- Manually add variables in Project Settings → Environment Variables
- Redeploy after adding variables

### Issue: Cache not working
**Solution**:
- Check environment variables are correct
- Verify Redis database is running
- Check Vercel logs for cache errors
- Ensure code is using correct variable names

## Plan Selection

**Important**: When setting up Upstash Redis, you'll need to choose a plan. See the detailed guide:

📖 **[Upstash Redis Plan Selection Guide](./UPSTASH_REDIS_PLAN_SELECTION.md)**

**Quick Recommendation**: Start with **Fixed 1GB ($20/month)** for most stores. This provides:
- Capacity for 500-2,000 active users
- 1GB storage (suitable for 1,000-5,000 products)
- 100GB bandwidth (moderate traffic)
- Easy upgrade path when needed

## References

- [Vercel Storage Documentation](https://vercel.com/docs/storage)
- [Vercel Marketplace - Redis](https://vercel.com/marketplace?category=storage&search=redis)
- [Upstash Documentation](https://docs.upstash.com/)
- [Redis Documentation](https://redis.io/docs/)
- [Upstash Redis Plan Selection Guide](./UPSTASH_REDIS_PLAN_SELECTION.md)

## Next Steps

After setting up Redis:

1. ✅ Deploy your code
2. ✅ Verify environment variables are set
3. ✅ Test product caching
4. ✅ Monitor cache performance
5. ✅ Check cache hit rates

---

**Status**: Ready for Phase 2 deployment
**Last Updated**: January 15, 2026
