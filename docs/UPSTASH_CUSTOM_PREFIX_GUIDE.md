# Upstash Custom Prefix Configuration Guide

## Overview

When connecting Upstash Redis to your Vercel project, you'll be asked to set a **Custom Prefix** for environment variables. This guide explains what to use and why.

## ⚠️ Important: Custom Prefix Setting

### Recommended Custom Prefix: `UPSTASH_REDIS_REST`

**Why?**
- Our code in `src/lib/cache/redis.ts` already supports this naming convention
- It clearly identifies the Redis connection
- It matches Upstash's standard variable naming

### What This Creates

When you set the Custom Prefix to `UPSTASH_REDIS_REST`, Vercel will automatically create:

- ✅ `UPSTASH_REDIS_REST_URL` - The Redis REST API URL
- ✅ `UPSTASH_REDIS_REST_TOKEN` - The Redis REST API authentication token

## Step-by-Step Configuration

### In the "Connect Project" Dialog:

1. **Project Name**: `storeflow-website` (or your project name)
   - This should already be selected

2. **Environments**: ✅ Check all three
   - ✅ Development
   - ✅ Preview  
   - ✅ Production
   - **Why**: You want Redis available in all environments for consistent caching behavior

3. **Custom Prefix**: Change from `STORAGE` to **`UPSTASH_REDIS_REST`**
   - **Default shown**: `STORAGE` (would create `STORAGE_URL` and `STORAGE_TOKEN`)
   - **Change to**: `UPSTASH_REDIS_REST` (creates `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`)
   - **Suffix shown**: `_URL` (this is automatic, don't change it)

4. **Click "Continue"** to complete the connection

## Why Not Use the Default `STORAGE` Prefix?

If you use the default `STORAGE` prefix, Vercel will create:
- `STORAGE_URL`
- `STORAGE_TOKEN`

**Problem**: Our code doesn't look for these variable names!

Our code in `src/lib/cache/redis.ts` checks for:
```typescript
const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
```

**Solution**: Use `UPSTASH_REDIS_REST` as the prefix so the variables match what our code expects.

## Alternative Prefix Options

If you prefer a different prefix, you have two options:

### Option 1: Use `KV_REST_API` Prefix

If you set the prefix to `KV_REST_API`, it will create:
- `KV_REST_API_URL` ✅
- `KV_REST_API_TOKEN` ✅

This also works with our code!

### Option 2: Keep Default and Add Aliases

If you already used `STORAGE` or want a different prefix:

1. **In Vercel Dashboard** → Project Settings → Environment Variables
2. **Add aliases**:
   - `UPSTASH_REDIS_REST_URL` = `{YOUR_PREFIX}_URL`
   - `UPSTASH_REDIS_REST_TOKEN` = `{YOUR_PREFIX}_TOKEN`

This way, your code will still work even with a different prefix.

## Verification After Setup

After connecting Upstash Redis:

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Verify these variables exist**:
   - ✅ `UPSTASH_REDIS_REST_URL` (or `KV_REST_API_URL`)
   - ✅ `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_TOKEN`)
3. **Check they're available in all environments**:
   - Development ✅
   - Preview ✅
   - Production ✅

## Quick Reference

| Custom Prefix | Creates Variables | Works with Our Code? |
|---------------|-------------------|----------------------|
| `UPSTASH_REDIS_REST` ⭐ | `UPSTASH_REDIS_REST_URL`<br>`UPSTASH_REDIS_REST_TOKEN` | ✅ Yes (Recommended) |
| `KV_REST_API` | `KV_REST_API_URL`<br>`KV_REST_API_TOKEN` | ✅ Yes |
| `STORAGE` (default) | `STORAGE_URL`<br>`STORAGE_TOKEN` | ❌ No (needs aliases) |
| `REDIS` | `REDIS_URL`<br>`REDIS_TOKEN` | ❌ No (needs aliases) |

## Summary

**✅ Recommended Action**: Set Custom Prefix to **`UPSTASH_REDIS_REST`**

This ensures:
- Environment variables match what our code expects
- No additional configuration needed
- Clear, descriptive variable names
- Works immediately after setup

---

**Status**: Ready for configuration  
**Last Updated**: January 15, 2026
