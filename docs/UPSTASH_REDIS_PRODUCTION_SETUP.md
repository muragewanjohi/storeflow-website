# Upstash Redis Production Setup Guide

## Overview

This guide walks you through setting up Upstash Redis for production caching in your StoreFlow application deployed on Vercel.

## Prerequisites

- ✅ StoreFlow application deployed on Vercel
- ✅ Upstash account (sign up at https://upstash.com)
- ✅ Access to Vercel project settings

## Step-by-Step Setup

### Step 1: Create Upstash Account

1. Go to https://upstash.com
2. Click **"Sign Up"** (or **"Log In"** if you already have an account)
3. Sign up with GitHub, Google, or email
4. Verify your email if required

### Step 2: Create Redis Database

1. Once logged in, click **"Create Database"** or **"New Database"**
2. Fill in the database details:
   - **Name**: `storeflow-production` (or your preferred name)
   - **Type**: Select **"Redis"**
   - **Region**: Choose the region closest to your Vercel deployment
     - For US deployments: `us-east-1` (N. Virginia) or `us-west-1` (N. California)
     - For EU deployments: `eu-west-1` (Ireland) or `eu-central-1` (Frankfurt)
     - For Asia: `ap-southeast-1` (Singapore) or `ap-northeast-1` (Tokyo)
   - **Plan**: 
     - **Start with**: **Fixed 1GB** ($20/month) - Recommended for most stores
     - See `UPSTASH_REDIS_PLAN_SELECTION.md` for detailed plan recommendations
3. Click **"Create"**

### Step 3: Get Database Credentials

After creating the database, you'll see the database details page with:

1. **REST URL**: Something like `https://your-db-name-12345.upstash.io`
2. **REST TOKEN**: A long token string starting with `AX...`

**Important**: Copy both values - you'll need them for Vercel environment variables.

### Step 4: Add Environment Variables to Vercel

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select your **StoreFlow project**
3. Navigate to **Settings** → **Environment Variables**
4. Add the following two environment variables:

   **Variable 1:**
   - **Name**: `UPSTASH_REDIS_REST_URL`
   - **Value**: Paste the REST URL from Step 3
   - **Environment**: Select all (Production, Preview, Development)
   - Click **"Save"**

   **Variable 2:**
   - **Name**: `UPSTASH_REDIS_REST_TOKEN`
   - **Value**: Paste the REST TOKEN from Step 3
   - **Environment**: Select all (Production, Preview, Development)
   - Click **"Save"**

### Step 5: Redeploy Application

After adding environment variables:

1. Go to **Deployments** tab in Vercel
2. Click the **"..."** menu on the latest deployment
3. Select **"Redeploy"**
4. Or push a new commit to trigger a new deployment

**Why redeploy?** Environment variables are only available to new deployments.

### Step 6: Verify Redis Connection

After redeployment, check your application logs:

1. Go to Vercel dashboard → Your project → **Deployments**
2. Click on the latest deployment
3. Go to **"Functions"** tab
4. Look for logs containing: `[Cache] Upstash Redis initialized successfully`

**Expected log output:**
```
[Cache] Upstash Redis initialized successfully
```

**If you see:**
```
[Cache] Upstash Redis not configured (missing env vars), using in-memory cache
```

This means the environment variables weren't picked up. Check:
- Variables are saved correctly in Vercel
- Variables are available for the correct environment (Production/Preview/Development)
- You've redeployed after adding the variables

## Testing Redis Cache

### Option 1: Check Application Logs

Monitor your application logs during normal usage. You should see:
- Cache hits reducing database queries
- Faster response times for cached endpoints

### Option 2: Use Upstash Console

1. Go to your Upstash dashboard
2. Click on your Redis database
3. Go to **"Console"** tab
4. Run commands to check cache:
   ```redis
   KEYS products:*
   GET products:your-tenant-id:list:...
   ```

### Option 3: Monitor Cache Usage

1. In Upstash dashboard, go to your database
2. Check **"Metrics"** tab to see:
   - Commands executed
   - Storage used
   - Bandwidth consumed
   - Cache hit/miss rates

## Environment Variables Summary

Add these to Vercel:

| Variable Name | Description | Example Value |
|--------------|-------------|---------------|
| `UPSTASH_REDIS_REST_URL` | REST API endpoint for your Redis database | `https://your-db-name-12345.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Authentication token for REST API | `AX...` (long token string) |

## Plan Selection

**Recommended starting plan**: **Fixed 1GB ($20/month)**

- Suitable for stores with 500-2,000 active users
- 1GB storage capacity
- 100GB bandwidth/month
- Easy to upgrade when needed

See `UPSTASH_REDIS_PLAN_SELECTION.md` for detailed plan recommendations based on your traffic and product catalog size.

## Troubleshooting

### Issue: Redis not initializing

**Symptoms:**
- Logs show: `[Cache] Upstash Redis not configured`
- Application falls back to in-memory cache

**Solutions:**
1. Verify environment variables are set in Vercel
2. Check variable names are exactly: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Ensure variables are available for Production environment
4. Redeploy the application after adding variables
5. Check for typos in the REST URL or TOKEN

### Issue: Redis connection errors

**Symptoms:**
- Logs show: `Redis cache get error` or `Redis cache set error`
- Application falls back to memory cache

**Solutions:**
1. Verify REST URL is correct (should start with `https://`)
2. Verify REST TOKEN is correct (should start with `AX...`)
3. Check Upstash dashboard for database status
4. Verify database region matches your deployment region
5. Check if you've exceeded plan limits (storage/bandwidth)

### Issue: High costs

**Symptoms:**
- Unexpected charges on Upstash
- Bandwidth or storage limits exceeded

**Solutions:**
1. Monitor usage in Upstash dashboard
2. Review cache TTL settings (see `CACHE_TTL` constants in `src/lib/cache/redis.ts`)
3. Consider upgrading to a Fixed plan if on Pay As You Go
4. Optimize cache keys to reduce storage
5. Review which endpoints are using cache

## Cache Configuration

The Redis cache is automatically configured in `src/lib/cache/redis.ts`:

- **Default TTL**: 5 minutes (300 seconds)
- **Product List TTL**: 5 minutes
- **Product Detail TTL**: 1 hour (3600 seconds)
- **Fallback**: In-memory cache if Redis unavailable

## Security Best Practices

1. **Never commit credentials to Git**
   - Environment variables should only be in Vercel
   - Add `.env.local` to `.gitignore` (already done)

2. **Use different databases for environments**
   - Create separate Upstash databases for:
     - Production
     - Preview/Staging
     - Development (optional - can use in-memory)

3. **Rotate tokens periodically**
   - In Upstash dashboard, you can regenerate REST TOKEN
   - Update Vercel environment variables when rotating

4. **Monitor access**
   - Check Upstash dashboard regularly for unusual activity
   - Set up alerts for usage limits

## Cost Monitoring

### Upstash Dashboard

1. Go to your Upstash dashboard
2. Click on your database
3. Check **"Metrics"** tab for:
   - Current storage usage
   - Bandwidth consumption
   - Command count
   - Estimated costs

### Set Up Alerts

1. In Upstash dashboard → Your database → **"Settings"**
2. Configure alerts for:
   - Storage approaching limit (e.g., 80% of plan limit)
   - Bandwidth approaching limit
   - Unusual command spikes

## Next Steps

After Redis is configured:

1. ✅ Monitor cache performance in Upstash dashboard
2. ✅ Check application logs for cache initialization
3. ✅ Monitor costs for first month
4. ✅ Adjust cache TTLs if needed (in `src/lib/cache/redis.ts`)
5. ✅ Consider upgrading plan if approaching limits

## Support

- **Upstash Documentation**: https://docs.upstash.com/redis
- **Upstash Support**: https://upstash.com/support
- **Vercel Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables

---

**Status**: Ready for production setup  
**Last Updated**: January 15, 2026
