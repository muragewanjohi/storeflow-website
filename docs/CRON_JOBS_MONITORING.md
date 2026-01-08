# Cron Jobs Monitoring Dashboard

**Last Updated:** 2024

---

## Overview

The Cron Jobs Monitoring Dashboard allows landlords to view, monitor, and manually trigger automated background jobs.

**Location:** `/admin/cron-jobs`

---

## Features

### 1. View Cron Job Status

- **Statistics Dashboard:**
  - Total executions
  - Successful runs
  - Failed runs
  - Currently running jobs

- **Job Status:**
  - Last execution time
  - Execution duration
  - Success/failure status
  - Error messages (if any)

### 2. View Execution Logs

- **Recent Logs:** Last 50 cron job executions
- **Filter by Job:** View logs for specific jobs
- **Details:** Start time, completion time, duration, errors

### 3. Manual Trigger (Restart)

- **Restart Button:** Manually trigger any cron job
- **Real-time Status:** See job execution in progress
- **Results:** View execution results immediately

---

## Configured Cron Jobs

| Job Name | Path | Schedule | Description |
|----------|------|----------|-------------|
| **Payment Reminders** | `/api/admin/subscriptions/payment-reminders` | Daily at 9 AM UTC | Sends subscription renewal and payment due reminder emails |
| **Expiry Checker** | `/api/admin/subscriptions/expiry-checker` | Daily at midnight UTC | Checks for expired subscriptions and applies grace period logic |
| **Analytics Aggregate** | `/api/admin/analytics/aggregate` | Daily at 1 AM UTC | Pre-computes daily analytics data for all tenants |
| **Process Scheduled Downgrades** | `/api/admin/subscriptions/process-scheduled-downgrades` | Daily at 4 AM UTC | Processes scheduled plan downgrades that are due to take effect |
| **Data Cleanup** | `/api/admin/cleanup` | Weekly on Sunday at 2 AM UTC | Cleans up old data and temporary files |
| **Hard Delete Tenants** | `/api/admin/cleanup/hard-delete-tenants` | Weekly on Sunday at 3 AM UTC | Hard deletes tenants past retention period (90 days) |

---

## Automatic Execution

**Yes, cron jobs run automatically!**

All cron jobs are configured in `vercel.json` and run automatically on Vercel:

```json
{
  "crons": [
    {
      "path": "/api/admin/subscriptions/expiry-checker",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/admin/subscriptions/payment-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/admin/analytics/aggregate",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/admin/subscriptions/process-scheduled-downgrades",
      "schedule": "0 4 * * *"
    },
    {
      "path": "/api/admin/cleanup",
      "schedule": "0 2 * * 0"
    },
    {
      "path": "/api/admin/cleanup/hard-delete-tenants",
      "schedule": "0 3 * * 0"
    }
  ]
}
```

**Schedule Format:** `minute hour day month day-of-week`
- `0 0 * * *` = Daily at midnight UTC
- `0 1 * * *` = Daily at 1 AM UTC
- `0 4 * * *` = Daily at 4 AM UTC
- `0 9 * * *` = Daily at 9 AM UTC
- `0 2 * * 0` = Weekly on Sunday at 2 AM UTC
- `0 3 * * 0` = Weekly on Sunday at 3 AM UTC

### ⚠️ Important: Authentication Setup

**If cron jobs are failing with "Unauthorized - Invalid token" errors:**

Vercel cron jobs should automatically send the `x-vercel-cron` header, but if this isn't working, you need to ensure `CRON_SECRET_TOKEN` is properly configured:

1. **Set CRON_SECRET_TOKEN in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `CRON_SECRET_TOKEN` with a secure random token
   - Apply to: Production, Preview, Development

2. **Verify the token is set:**
   ```bash
   # Check in Vercel dashboard or via CLI
   vercel env ls
   ```

3. **Redeploy after setting the token:**
   - After adding the environment variable, trigger a new deployment
   - Cron jobs will use the token for authentication

**Note:** The code checks for the `x-vercel-cron` header first (case-insensitive). If the header is present, authentication is bypassed. If not, it falls back to checking the `CRON_SECRET_TOKEN` in the Authorization header.

---

## Manual Trigger

### Via Dashboard

1. Go to **Admin Dashboard** → **Cron Jobs**
2. Find the job you want to trigger
3. Click **Restart** button
4. Wait for execution to complete
5. View results in the logs section

### Via API

```bash
curl -X POST https://your-app.vercel.app/api/admin/cron-jobs \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"jobPath": "/api/admin/subscriptions/payment-reminders"}'
```

**Note:** Requires landlord authentication.

---

## Monitoring

### Check Job Status

1. Go to `/admin/cron-jobs`
2. View **Statistics** cards for overall health
3. Check **Configured Cron Jobs** section for individual job status
4. Review **Recent Execution Logs** for detailed history

### Troubleshooting Failed Jobs

1. **Check Error Message:**
   - Go to Cron Jobs dashboard
   - Find failed job in "Recent Execution Logs"
   - Click to expand and view error details

2. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Deployments
   - Click on latest deployment
   - View Function Logs for cron job executions

3. **Manual Trigger:**
   - Use "Restart" button to test immediately
   - Check if error persists

---

## Database Schema

Cron job logs are stored in `cron_job_logs` table:

```sql
CREATE TABLE cron_job_logs (
  id UUID PRIMARY KEY,
  job_name VARCHAR(255),
  job_path VARCHAR(500),
  status VARCHAR(50), -- running, success, failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  result JSONB,
  error TEXT,
  metadata JSONB
);
```

---

## API Endpoints

### GET /api/admin/cron-jobs

Get cron job logs and statistics.

**Query Parameters:**
- `jobName` (optional): Filter by job name
- `limit` (optional): Number of logs to return (default: 50)

**Response:**
```json
{
  "logs": [...],
  "stats": {
    "total": 100,
    "successful": 95,
    "failed": 5,
    "running": 0,
    "jobs": [...]
  }
}
```

### POST /api/admin/cron-jobs

Manually trigger a cron job.

**Body:**
```json
{
  "jobPath": "/api/admin/subscriptions/payment-reminders"
}
```

**Response:**
```json
{
  "message": "Job executed successfully",
  "result": {...},
  "timestamp": "2024-12-20T12:00:00Z"
}
```

---

## Email Reminders - Kenya Pricing

### How Kenya Detection Works

1. **Tenant Country Field:**
   - System checks `tenants.country` field
   - If `country = 'KE'` or `'Kenya'` → Uses KES flat rates
   - Otherwise → Uses USD prices

2. **Flat Rates for Kenya:**
   - **Basic Plan:** KES 1,000 (not converted from USD)
   - **Pro/Standard Plan:** KES 3,000
   - **Premium Plan:** KES 6,000

3. **Email Display:**
   - Kenya tenants see: `Ksh 1,000` (formatted with commas)
   - Other tenants see: `$10.00`

### Setting Tenant Country

**Via Database:**
```sql
UPDATE tenants
SET country = 'KE'
WHERE id = 'tenant-id';
```

**Via Admin Dashboard:**
- Go to `/admin/tenants/[id]`
- Update tenant settings
- Set country field to "Kenya" or "KE"

---

## Payment Links - Tenant Store

### How Payment Links Work

1. **Tenant Store URL:**
   - System builds URL from tenant's `subdomain` or `custom_domain`
   - Uses `NEXT_PUBLIC_BASE_DOMAIN` for subdomain construction
   - Payment link points to: `{tenant-store-url}/dashboard/subscription`

2. **URL Construction:**
   - **Custom Domain:** `https://custom-domain.com/dashboard/subscription`
   - **Subdomain:** `https://subdomain.dukanest.com/dashboard/subscription`
   - **Fallback:** `https://app-url.com/dashboard/subscription`

3. **Email Button:**
   - "Make Payment" button in emails now links to tenant's store
   - Tenant can pay directly from their own storefront

---

## Process Scheduled Downgrades Job

### Overview

The **Process Scheduled Downgrades** job processes plan downgrades that were scheduled for the next billing cycle. When a tenant downgrades their plan, the change is scheduled to take effect at the end of their current billing period (following industry best practices).

### What It Does

1. **Finds Scheduled Downgrades:**
   - Queries tenants with `scheduled_plan_id` set
   - Checks if `scheduled_plan_change_date` has passed or is today

2. **Applies Downgrades:**
   - Updates tenant's `plan_id` to the scheduled plan
   - Calculates new expiration date based on new plan duration
   - Clears scheduled downgrade fields (`scheduled_plan_id`, `scheduled_plan_change_date`)
   - Updates subscription change history status to "completed"

3. **Sends Notifications:**
   - Sends email notification to tenant confirming downgrade took effect
   - Includes details about new plan and effective date

### Schedule

- **Path:** `/api/admin/subscriptions/process-scheduled-downgrades`
- **Schedule:** Daily at 4 AM UTC (`0 4 * * *`)
- **Frequency:** Once per day

### Why 4 AM UTC?

- Runs after expiry checker (midnight) and analytics (1 AM)
- Before payment reminders (9 AM)
- Ensures downgrades are processed before business hours
- Gives time for any issues to be resolved before users log in

### Example Flow

1. **Day 1:** Tenant downgrades from Pro to Basic Plan
   - Downgrade scheduled for next billing cycle
   - Tenant keeps Pro Plan features until expiration

2. **Day 30:** Tenant's billing cycle ends
   - `scheduled_plan_change_date` = Day 30

3. **Day 31, 4 AM UTC:** Cron job runs
   - Finds tenant with scheduled downgrade
   - Applies Basic Plan
   - Sends confirmation email
   - Updates subscription history

### Monitoring

- **View Logs:** Check `/admin/cron-jobs` dashboard
- **Manual Trigger:** Use "Restart" button in dashboard
- **Error Handling:** Failed downgrades are logged with tenant ID and error details

### Related Documentation

- [Subscription Best Practices](./SUBSCRIPTION_BEST_PRACTICES.md)
- [Subscription Implementation Status](./SUBSCRIPTION_IMPLEMENTATION_STATUS.md)

---

## Summary

| Feature | Status |
|---------|--------|
| **Automatic Cron Jobs** | ✅ Yes - Runs daily/weekly automatically |
| **Cron Job Monitoring** | ✅ Yes - Dashboard at `/admin/cron-jobs` |
| **View Execution Logs** | ✅ Yes - Last 50 executions with details |
| **View Failed Jobs** | ✅ Yes - Error messages displayed |
| **Manual Trigger/Restart** | ✅ Yes - Restart button for each job |
| **Kenya Pricing Detection** | ✅ Yes - Based on tenant.country field |
| **Tenant Store Payment Links** | ✅ Yes - Links to tenant's subdomain/custom domain |
| **Scheduled Downgrades** | ✅ Yes - Processes downgrades at end of billing cycle |

---

**Last Updated:** 2025-01-08
