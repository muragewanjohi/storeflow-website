# Cron Jobs Troubleshooting Guide

## Common Issue: Cron Jobs Fail Automatically But Work Manually

### Problem Description

Cron jobs configured in `vercel.json` fail when run automatically by Vercel, but work perfectly when triggered manually via the "Restart" button in the admin dashboard.

**Error Message:**
```
Unauthorized - Invalid token. Vercel cron jobs should send x-vercel-cron header or Authorization header with CRON_SECRET_TOKEN. Debug: hasVercelCronHeader: false, hasAuthHeader: false, hasQueryToken: false, hasExpectedToken: true
```

### Root Cause

**The Issue:**
- When Vercel runs cron jobs automatically, it should send the `x-vercel-cron` header
- However, this header may not be detected properly due to:
  1. Case sensitivity issues
  2. Header name variations
  3. Vercel plan limitations (Hobby plan restrictions)
  4. Route caching issues

**Why Manual Triggers Work:**
- Manual triggers use the `Authorization: Bearer ${CRON_SECRET_TOKEN}` header
- This bypasses the Vercel cron header check
- The token authentication works correctly

### Solution

We've implemented a unified authentication utility (`src/lib/cron-jobs/auth.ts`) that:

1. **Checks for Vercel Cron Header** (case-insensitive)
   - `x-vercel-cron`
   - `x-vercel-signature`
   - `X-Vercel-Cron` (case variations)

2. **Falls Back to Token Authentication**
   - Checks `Authorization` header
   - Checks query parameter `?token=...`
   - Validates against `CRON_SECRET_TOKEN` environment variable

3. **Development Mode Support**
   - Allows requests without authentication in development
   - Logs warnings for debugging

### Authentication Flow

```
Request Received
    ↓
Check for x-vercel-cron header?
    ├─ YES → Authorized (Vercel cron)
    └─ NO → Check for CRON_SECRET_TOKEN?
            ├─ Not Set → Allow (dev mode) or Deny (prod)
            └─ Set → Check Authorization header or query token?
                     ├─ Valid → Authorized (manual trigger)
                     └─ Invalid → Denied
```

### Why This Happens

**Vercel Cron Jobs:**
- Vercel automatically sends `x-vercel-cron` header when running scheduled cron jobs
- This header is used to authenticate that the request is from Vercel's cron system
- **However**, there are cases where this header might not be sent:
  - Hobby plan limitations (only 1 cron per day)
  - Cron jobs not properly registered in Vercel
  - Route caching issues
  - Edge runtime differences

**Manual Triggers:**
- Use `Authorization: Bearer ${CRON_SECRET_TOKEN}` header
- This is set by the admin dashboard when clicking "Restart"
- Works because it bypasses the Vercel header check

### Fixes Applied

1. **Unified Authentication Utility**
   - Created `src/lib/cron-jobs/auth.ts`
   - Handles both Vercel cron headers and token authentication
   - Provides debug information for troubleshooting

2. **Improved Header Detection**
   - Case-insensitive header checking
   - Multiple header name variations
   - Better error messages with debug info

3. **All Cron Jobs Updated**
   - `expiry-checker` - Updated to use shared auth utility
   - `payment-reminders` - Already had proper auth
   - `process-scheduled-downgrades` - Already had proper auth
   - `analytics/aggregate` - Updated with logging
   - `cleanup` - Updated with logging
   - `hard-delete-tenants` - Updated header detection
   - `sales/automate` - Already had proper auth

4. **Manual Trigger Handler**
   - Updated to include all cron jobs
   - Properly sets both `x-vercel-cron` header and `Authorization` header
   - Uses correct URL for each job

### Verification Steps

1. **Check Vercel Configuration**
   ```bash
   # Verify vercel.json has cron jobs configured
   cat vercel.json
   ```

2. **Check Environment Variables**
   ```bash
   # Ensure CRON_SECRET_TOKEN is set in Vercel
   # Vercel Dashboard → Settings → Environment Variables
   ```

3. **Check Cron Job Registration**
   - Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
   - Verify all cron jobs are listed and active

4. **Check Logs**
   - Vercel Dashboard → Your Project → Logs
   - Filter by cron job path
   - Look for authentication errors

### Common Fixes

#### Fix 1: Ensure CRON_SECRET_TOKEN is Set

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `CRON_SECRET_TOKEN` with a secure random value
3. Ensure it's set for **Production** environment
4. Redeploy your application

#### Fix 2: Verify vercel.json Configuration

Ensure `vercel.json` is in the project root and correctly formatted:

```json
{
  "crons": [
    {
      "path": "/api/admin/subscriptions/expiry-checker",
      "schedule": "0 0 * * *"
    }
  ]
}
```

#### Fix 3: Check Vercel Plan Limitations

**Hobby Plan:**
- Only 1 cron job per day
- May run at any time within the scheduled hour
- Limited to production deployments only

**Pro/Team Plan:**
- Unlimited cron jobs
- Precise scheduling
- Works in preview deployments

#### Fix 4: Ensure Routes Are Dynamic

Add to your cron job route files:

```typescript
export const dynamic = 'force-dynamic';
```

This prevents Next.js from caching the route.

### Testing

**Test Manual Trigger:**
1. Go to Admin Dashboard → Cron Jobs
2. Click "Restart" on any cron job
3. Should execute successfully

**Test Automatic Execution:**
1. Wait for scheduled time
2. Check Vercel logs for execution
3. Check cron job logs in admin dashboard
4. Verify no authentication errors

### Debugging

**Enable Debug Logging:**

The authentication utility provides debug information:

```typescript
const authResult = verifyCronJobAuth(request);
console.log('Auth result:', authResult.debug);
```

**Check Vercel Logs:**

1. Go to Vercel Dashboard → Your Project → Logs
2. Filter by function name (e.g., "expiry-checker")
3. Look for authentication-related errors
4. Check header information in logs

### Best Practices

1. **Always Set CRON_SECRET_TOKEN**
   - Use a strong, random token
   - Store in Vercel environment variables
   - Never commit to git

2. **Use Shared Auth Utility**
   - Import from `@/lib/cron-jobs/auth`
   - Consistent authentication across all cron jobs
   - Better error messages

3. **Log Cron Job Executions**
   - Use `startCronJobLog` and `completeCronJobLog`
   - Track success/failure rates
   - Monitor execution times

4. **Test in Preview First**
   - Test cron jobs in preview deployments
   - Verify authentication works
   - Check logs before production

### Related Files

- `src/lib/cron-jobs/auth.ts` - Shared authentication utility
- `src/lib/cron-jobs/logger.ts` - Cron job logging
- `src/app/api/admin/cron-jobs/route.ts` - Manual trigger handler
- `vercel.json` - Cron job configuration

---

**Last Updated:** January 2025  
**Maintained By:** StoreFlow Team
