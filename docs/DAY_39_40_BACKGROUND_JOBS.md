# Day 39-40: Background Jobs Implementation

**Date:** 2024  
**Status:** ✅ COMPLETE

---

## Overview

This document describes the background jobs and cron tasks implemented for the StoreFlow platform. These jobs handle automated tasks like subscription management, analytics aggregation, and data cleanup.

---

## Implemented Cron Jobs

### 1. Subscription Expiry Checker

**Endpoint:** `/api/admin/subscriptions/expiry-checker`  
**Schedule:** Daily at midnight UTC (`0 0 * * *`)  
**Purpose:** Checks for expired subscriptions and applies grace period logic

**What it does:**
- Finds all tenants with expired subscriptions (`expire_date <= now`)
- Applies grace period logic (default: 7 days)
- Updates tenant status:
  - `expired` - Still in grace period (can still access)
  - `suspended` - Past grace period (access blocked)
- Sends email notifications to tenants when status changes

**Implementation:** `storeflow/src/app/api/admin/subscriptions/expiry-checker/route.ts`

---

### 2. Payment Reminders

**Endpoint:** `/api/admin/subscriptions/payment-reminders`  
**Schedule:** Daily at 9 AM UTC (`0 9 * * *`)  
**Purpose:** Sends payment reminder emails to tenants with upcoming or overdue payments

**What it does:**
- Finds tenants with subscriptions expiring in 7 days
- Sends renewal reminder emails
- Sends payment due reminder emails
- Handles errors gracefully (continues processing other tenants)

**Implementation:** `storeflow/src/app/api/admin/subscriptions/payment-reminders/route.ts`

---

### 3. Analytics Aggregation

**Endpoint:** `/api/admin/analytics/aggregate`  
**Schedule:** Daily at 1 AM UTC (`0 1 * * *`)  
**Purpose:** Pre-computes daily analytics data for all tenants

**What it does:**
- Aggregates yesterday's analytics for each tenant:
  - Orders count
  - Revenue (paid orders only)
  - New customers
  - Products sold
- Stores aggregated data in cache (Redis/Vercel KV)
- Improves dashboard performance by pre-computing data

**Implementation:** `storeflow/src/app/api/admin/analytics/aggregate/route.ts`

**Cache Strategy:**
- Data cached for 24 hours
- Cache key format: `analytics:{tenantId}:overview:daily:{date}`
- Reduces database load on analytics dashboard

---

### 4. Data Cleanup

**Endpoint:** `/api/admin/cleanup`  
**Schedule:** Weekly on Sunday at 2 AM UTC (`0 2 * * 0`)  
**Purpose:** Performs various data cleanup tasks

**What it does:**
- **Old Cart Items:** Deletes cart items older than 30 days
- **Orphaned Records:** Cleans up orphaned `order_products` (orders that don't exist)
- **Orphaned Cart Items:** Cleans up cart items with invalid product IDs
- **Future:** Can be extended for:
  - Old session data
  - Expired password reset tokens
  - Old support ticket attachments
  - Archive old logs

**Implementation:** `storeflow/src/app/api/admin/cleanup/route.ts`

---

## Vercel Cron Configuration

All cron jobs are configured in `vercel.json`:

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
      "path": "/api/admin/cleanup",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

---

## Security

All cron job endpoints are protected by `CRON_SECRET_TOKEN`:

1. **Environment Variable:** `CRON_SECRET_TOKEN` must be set
2. **Authorization Header:** `Authorization: Bearer {token}`
3. **Vercel Automatic:** Vercel automatically adds the token when calling cron jobs

**See:** [`CRON_SECRET_TOKEN_SETUP.md`](CRON_SECRET_TOKEN_SETUP.md) for setup instructions

---

## Cron Schedule Reference

| Job | Schedule | Description |
|-----|----------|-------------|
| Subscription Expiry Checker | `0 0 * * *` | Daily at midnight UTC |
| Payment Reminders | `0 9 * * *` | Daily at 9 AM UTC |
| Analytics Aggregation | `0 1 * * *` | Daily at 1 AM UTC |
| Data Cleanup | `0 2 * * 0` | Weekly on Sunday at 2 AM UTC |

**Cron Format:** `minute hour day month weekday`

---

## Testing Cron Jobs

### Manual Testing

You can test cron jobs manually using curl:

```bash
# Test subscription expiry checker
curl -X GET \
  -H "Authorization: Bearer ${CRON_SECRET_TOKEN}" \
  https://your-app.vercel.app/api/admin/subscriptions/expiry-checker

# Test payment reminders
curl -X GET \
  -H "Authorization: Bearer ${CRON_SECRET_TOKEN}" \
  https://your-app.vercel.app/api/admin/subscriptions/payment-reminders

# Test analytics aggregation
curl -X GET \
  -H "Authorization: Bearer ${CRON_SECRET_TOKEN}" \
  https://your-app.vercel.app/api/admin/analytics/aggregate

# Test data cleanup
curl -X GET \
  -H "Authorization: Bearer ${CRON_SECRET_TOKEN}" \
  https://your-app.vercel.app/api/admin/cleanup
```

### Local Testing

For local development, you can:

1. **Disable token check temporarily** (development only):
   ```typescript
   // Comment out token check in route.ts
   // if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
   //   return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
   // }
   ```

2. **Use environment variable:**
   ```bash
   # In .env.local
   CRON_SECRET_TOKEN=your-test-token
   ```

3. **Test with curl:**
   ```bash
   curl -X GET \
     -H "Authorization: Bearer your-test-token" \
     http://localhost:3000/api/admin/subscriptions/expiry-checker
   ```

---

## Monitoring

### Vercel Cron Logs

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Deployments** → Select a deployment
4. Click **Functions** tab
5. View cron job execution logs

### Response Format

All cron jobs return a consistent response format:

```json
{
  "message": "Job completed",
  "results": {
    "processed": 10,
    "errors": []
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Handling

- Errors are logged to console
- Errors are included in response `results.errors` array
- Jobs continue processing even if individual items fail
- No partial failures - each tenant/item is processed independently

---

## Environment Variables

Required environment variables:

```env
# Cron Job Security
CRON_SECRET_TOKEN=your-secret-token-here

# Subscription Management
SUBSCRIPTION_GRACE_PERIOD_DAYS=7

# Cache (for analytics aggregation)
KV_REST_API_URL=your-vercel-kv-url
KV_REST_API_TOKEN=your-vercel-kv-token
```

---

## Future Enhancements

Potential additions to background jobs:

1. **Email Queue Processing**
   - Process email queue in batches
   - Retry failed emails
   - Rate limiting

2. **Backup Jobs**
   - Daily database backups
   - Backup verification
   - Old backup cleanup

3. **Report Generation**
   - Weekly/monthly reports
   - PDF generation
   - Email delivery

4. **Cache Warming**
   - Pre-warm frequently accessed data
   - Product listings
   - Popular pages

5. **Health Checks**
   - Database connectivity
   - External service status
   - Alert on failures

---

## Troubleshooting

### Cron Job Not Running

**Check:**
1. `vercel.json` is in project root
2. Environment variables are set in Vercel
3. Cron schedule is correct
4. Deployment is successful

**Solution:**
- Check Vercel deployment logs
- Verify cron job appears in Vercel dashboard
- Test endpoint manually

### Unauthorized Errors

**Check:**
1. `CRON_SECRET_TOKEN` is set
2. Token matches in all environments
3. Authorization header format is correct

**Solution:**
- Regenerate token if needed
- Update in all environments
- Test with curl

### Performance Issues

**Check:**
1. Database query performance
2. Number of tenants being processed
3. Cache hit rates

**Solution:**
- Add database indexes
- Batch processing
- Increase cache TTL
- Optimize queries

---

## Related Documentation

- [`CRON_SECRET_TOKEN_SETUP.md`](CRON_SECRET_TOKEN_SETUP.md) - Token setup guide
- [`SUBSCRIPTION_MANAGEMENT.md`](SUBSCRIPTION_MANAGEMENT.md) - Subscription logic
- [`DAY_38_PERFORMANCE_OPTIMIZATION.md`](DAY_38_PERFORMANCE_OPTIMIZATION.md) - Caching strategy

---

**Last Updated:** 2024

