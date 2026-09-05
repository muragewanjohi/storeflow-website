# Finding API Route Logs in Vercel

**Guide for locating server-side console.log messages in Vercel deployments**

---

## Where to Find API Route Logs

### Method 1: Function Logs (Recommended)

1. **Go to Vercel Dashboard** → Your Project → **Deployments**
2. **Click on your deployment** (the one you want to check)
3. **Click the "Functions" tab** (not "Logs")
4. **Look for:** `/api/auth/tenant/login`
5. **Click on it** to see function-specific logs

### Method 2: General Logs with Filters

1. **Go to Vercel Dashboard** → Your Project → **Deployments**
2. **Click on your deployment**
3. **Click the "Logs" tab**
4. **Set filters:**
   - **Route:** Search for `/api/auth/tenant/login`
   - **Timeline:** Set to "Last hour" or "Last 24 hours"
   - **Contains Console Level:** Check "Warning" and "Error" (our logs use console.log, but warnings/errors are more visible)

### Method 3: Real-Time Logs

1. **Go to Vercel Dashboard** → Your Project → **Deployments**
2. **Click on your deployment**
3. **Click the "Logs" tab**
4. **Keep the page open**
5. **Trigger a login attempt** from your browser
6. **Watch the logs appear in real-time**

---

## What to Look For

### Successful Bypass Logs

When bypass is working, you should see:

```
========================================
[LOGIN API] POST /api/auth/tenant/login
[LOGIN API] Request received
========================================
[LOGIN API] BYPASS CHECK
[LOGIN API] DISABLE_MFA_TEMPORARILY: true
[LOGIN API] NODE_ENV: development
[LOGIN API] disableMFA === "true": true
[LOGIN API] nodeEnv is dev/test: true
[LOGIN API] BYPASS WILL BE: true
========================================
[Login API] ⚠️ 2FA BYPASS ENABLED
[Login API] Login completed with 2FA bypass
```

### Failed Bypass Logs

If bypass isn't working, you'll see:

```
[LOGIN API] BYPASS CHECK
[LOGIN API] DISABLE_MFA_TEMPORARILY: undefined (or false)
[LOGIN API] NODE_ENV: production (or undefined)
[LOGIN API] BYPASS WILL BE: false
```

Then it will continue to try sending the OTP email.

---

## Common Issues

### Issue 1: No Logs Appearing

**Problem:** You search for "login" but see "No logs found" even with route filter set

**Solutions:**
1. **Expand time range:** 
   - Change from "Last 30 minutes" to "Last 24 hours" or "All time"
   - Logs might be older than you think

2. **Clear all filters first:**
   - Click "Reset Filters" button
   - Then manually set route filter again
   - Sometimes filters conflict

3. **Check Functions tab:**
   - Go to "Functions" tab instead of "Logs"
   - Functions tab shows serverless function logs separately
   - This is often where API route logs appear

4. **Verify route is actually being called:**
   - Open browser DevTools → Network tab
   - Attempt a login
   - Check if request to `/api/auth/tenant/login` appears
   - If it doesn't appear, the route isn't being called (check frontend code)

5. **Try without route filter:**
   - Remove the route filter
   - Search for "LOGIN API" in the search bar
   - See if logs appear in other routes

6. **Check if deployment has the latest code:**
   - Make sure you've deployed the code with the enhanced logging
   - The deployment should be after you added the `[LOGIN API]` logs

### Issue 2: Logs Show Wrong Environment Variables

**Problem:** Logs show `NODE_ENV: production` or `DISABLE_MFA_TEMPORARILY: undefined`

**Solutions:**
1. **Verify environment scope:** In Vercel → Settings → Environment Variables, make sure variables are set for **"Preview"** environment
2. **Redeploy:** Environment variables only apply to new deployments
3. **Check branch:** Make sure you're on the `dev` branch deployment

### Issue 3: Can't Find Function Logs

**Problem:** The "Functions" tab doesn't show your API route

**Solutions:**
1. **Wait a moment:** Functions only appear after they've been called
2. **Trigger the route:** Make a login attempt first
3. **Check route path:** Make sure the route is `/api/auth/tenant/login`
4. **Use general logs:** Fall back to Method 2 (General Logs with Filters)

---

## Quick Debug Steps

1. **First, test environment variables (FASTEST):**
   - Visit: `https://your-dev-url.vercel.app/api/test-env`
   - This will show if environment variables are being read
   - If variables show as "NOT SET", that's your problem

2. **Verify deployment:**
   - Go to Deployments
   - Find your `dev` branch deployment
   - Note the deployment ID
   - Make sure it's the LATEST deployment (after you set env vars)

3. **Expand time range:**
   - In Logs tab, change "Last 30 minutes" to "Last 24 hours"
   - Or use "All time" if available
   - Logs might be older than 30 minutes

4. **Try Functions tab instead:**
   - Click "Functions" tab (not "Logs")
   - Look for `/api/auth/tenant/login`
   - Click on it to see function-specific logs

5. **Real-time log watching:**
   - Keep the Logs tab open
   - Set time range to "Last hour"
   - Clear all filters (click "Reset Filters")
   - In another tab, trigger a login
   - Watch logs appear in real-time

6. **Verify route is being called:**
   - Check browser Network tab
   - Make sure the login request is actually going to `/api/auth/tenant/login`
   - Check if it's returning an error before reaching the server

---

## Alternative: Add a Test Endpoint

If logs are still hard to find, you can temporarily add a test endpoint to verify environment variables:

```typescript
// src/app/api/test-env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    DISABLE_MFA_TEMPORARILY: process.env.DISABLE_MFA_TEMPORARILY,
    NODE_ENV: process.env.NODE_ENV,
    bypassWillWork: process.env.DISABLE_MFA_TEMPORARILY === 'true' && 
                    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'),
  });
}
```

Then visit: `https://your-dev-url.vercel.app/api/test-env`

This will show you exactly what environment variables are being read.

---

## Related Documentation

- [Temporary 2FA Bypass Guide](./TEMPORARY_2FA_BYPASS.md)
- [Vercel Development Environment Setup](./VERCEL_DEV_ENVIRONMENT.md)

---

**Last Updated:** 2024
