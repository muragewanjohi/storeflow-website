# Vercel Cron Jobs Authentication Fix

## Problem

Cron jobs configured in `vercel.json` fail when run automatically by Vercel, but work when triggered manually. The error shows:

```
Unauthorized - Invalid token. Debug: hasVercelCronHeader: false, hasAuthHeader: false, hasQueryToken: false, hasExpectedToken: true
```

## Root Cause

**Vercel automatically sends `CRON_SECRET` in the Authorization header** (not `CRON_SECRET_TOKEN`). According to Vercel's documentation:

- When you set a `CRON_SECRET` environment variable, Vercel automatically sends it as `Authorization: Bearer ${CRON_SECRET}` when invoking cron jobs
- The `x-vercel-cron` header may not always be present or reliable
- Our code was checking for `CRON_SECRET_TOKEN` instead of `CRON_SECRET`

## Solution

### Step 1: Set CRON_SECRET in Vercel

1. Go to your Vercel project → Settings → Environment Variables
2. Add a new environment variable:
   - **Name:** `CRON_SECRET`
   - **Value:** Use the same value as your `CRON_SECRET_TOKEN` (or generate a new secure token)
   - **Environment:** All Environments (Production, Preview, Development)

### Step 2: Keep CRON_SECRET_TOKEN (Optional)

You can keep `CRON_SECRET_TOKEN` for backward compatibility with manual triggers, or you can:
- Use the same value for both `CRON_SECRET` and `CRON_SECRET_TOKEN`
- Or remove `CRON_SECRET_TOKEN` and use only `CRON_SECRET` (the code supports both)

### Step 3: Verify Configuration

After setting `CRON_SECRET`:
1. Wait for the next automatic cron job execution
2. Check the cron jobs monitoring dashboard
3. The jobs should now succeed automatically

## How It Works Now

The updated authentication utility (`src/lib/cron-jobs/auth.ts`) now:

1. **Checks for `CRON_SECRET`** (Vercel's standard) - Used for automatic cron jobs
2. **Falls back to `CRON_SECRET_TOKEN`** - Used for manual triggers and backward compatibility
3. **Checks Authorization header** - Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically
4. **Checks query parameter** - Manual triggers can use `?token=...`
5. **Checks x-vercel-cron header** - As a fallback (may not always be present)

## Authentication Flow

```
Vercel Automatic Cron Job
    ↓
Sends: Authorization: Bearer ${CRON_SECRET}
    ↓
Code checks: process.env.CRON_SECRET || process.env.CRON_SECRET_TOKEN
    ↓
Matches provided token → ✅ Authorized

Manual Trigger
    ↓
Sends: Authorization: Bearer ${CRON_SECRET_TOKEN} (or ?token=...)
    ↓
Code checks: process.env.CRON_SECRET || process.env.CRON_SECRET_TOKEN
    ↓
Matches provided token → ✅ Authorized
```

## Important Notes

1. **Both variables can have the same value** - This is the simplest approach
2. **CRON_SECRET is required for automatic Vercel cron jobs** - This is how Vercel authenticates
3. **CRON_SECRET_TOKEN is for manual triggers** - Used by the admin dashboard
4. **The code now supports both** - For maximum compatibility

## Verification

After setting `CRON_SECRET` in Vercel:

1. Wait for the next scheduled cron job execution
2. Check the cron jobs monitoring dashboard
3. All jobs should show "Success" status
4. No more "Unauthorized - Invalid token" errors

## Troubleshooting

If cron jobs still fail:

1. **Verify CRON_SECRET is set:**
   - Go to Vercel → Project → Settings → Environment Variables
   - Ensure `CRON_SECRET` exists and has a value
   - Ensure it's set for "All Environments"

2. **Check the value:**
   - The value should be at least 16 characters (Vercel recommendation)
   - Make sure there are no extra spaces or newlines

3. **Redeploy:**
   - After adding `CRON_SECRET`, trigger a new deployment
   - Environment variables are only available after deployment

4. **Check logs:**
   - Go to Vercel → Project → Logs
   - Look for cron job execution logs
   - Check for any authentication errors

## References

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
