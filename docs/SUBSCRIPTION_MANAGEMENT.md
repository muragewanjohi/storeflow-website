# Subscription Management Guide

**Last Updated:** 2024

---

## Overview

The subscription management system allows landlords to manage tenant subscriptions, including upgrades, downgrades, renewals, and automatic expiry handling.

---

## Features

### 1. Subscription Operations

- **Upgrade Plan:** Change tenant to a higher-tier plan
- **Downgrade Plan:** Change tenant to a lower-tier plan  
- **Renew Subscription:** Extend current subscription from expiration date
- **Automatic Expiry Check:** Cron job checks for expired subscriptions daily

### 2. Grace Period Logic

- **Default Grace Period:** 7 days (configurable via `SUBSCRIPTION_GRACE_PERIOD_DAYS`)
- **Expired Status:** Tenants in grace period are marked as "expired" but remain active
- **Suspended Status:** After grace period, tenants are automatically suspended

### 3. Billing History

- View subscription changes and payment history
- Track subscription status and expiration dates

---

## API Endpoints

### Update Subscription

**PUT** `/api/admin/tenants/[id]/subscription`

**Request Body:**
```json
{
  "plan_id": "uuid-of-new-plan",
  "action": "upgrade" | "downgrade" | "renew"
}
```

**Response:**
```json
{
  "message": "Subscription upgraded successfully",
  "tenant": { ... },
  "newExpireDate": "2024-12-31T00:00:00.000Z"
}
```

### Get Billing History

**GET** `/api/admin/tenants/[id]/billing`

**Response:**
```json
{
  "tenant": { ... },
  "billingHistory": [ ... ],
  "currentPlan": { ... },
  "subscriptionStatus": "active",
  "expireDate": "2024-12-31T00:00:00.000Z"
}
```

### Subscription Expiry Checker

**GET** `/api/admin/subscriptions/expiry-checker`

**Security:** Protected by `CRON_SECRET_TOKEN` environment variable

**Response:**
```json
{
  "message": "Expiry check completed",
  "results": {
    "checked": 10,
    "expired": 3,
    "gracePeriod": 2,
    "suspended": 1,
    "errors": []
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Cron Job Setup

### Option 1: Vercel Cron (Recommended)

The `vercel.json` file is already configured:

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

This runs daily at midnight UTC.

**Environment Variables Required:**
```env
CRON_SECRET_TOKEN=your-secret-token-here
SUBSCRIPTION_GRACE_PERIOD_DAYS=7
```

### Option 2: External Cron Service

You can use external services like:
- GitHub Actions
- EasyCron
- Cron-job.org

**Example GitHub Actions:**
```yaml
name: Check Subscription Expiry
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Call Expiry Checker
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET_TOKEN }}" \
            https://your-app.vercel.app/api/admin/subscriptions/expiry-checker
```

---

## Subscription Logic

### Upgrade/Downgrade

- Starts immediately with new plan duration
- Expiration date calculated from current date
- Tenant status set to "active"

### Renewal

- Extends from current expiration date (or now if expired)
- Preserves remaining subscription time
- Tenant status set to "active"

### Expiry Checker

1. Finds all tenants with `expire_date <= now` and `plan_id IS NOT NULL`
2. Calculates days expired
3. If `daysExpired <= GRACE_PERIOD_DAYS`:
   - Sets status to "expired" (but keeps access)
4. If `daysExpired > GRACE_PERIOD_DAYS`:
   - Sets status to "suspended" (blocks access)

---

## Environment Variables

```env
# Subscription Management
SUBSCRIPTION_GRACE_PERIOD_DAYS=7

# Cron Job Security
CRON_SECRET_TOKEN=your-secret-token-here
```

---

## Testing

### Manual Expiry Check

```bash
curl -X GET \
  -H "Authorization: Bearer your-cron-secret-token" \
  https://your-app.vercel.app/api/admin/subscriptions/expiry-checker
```

### Test Subscription Change

```bash
curl -X PUT \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"plan_id": "new-plan-uuid", "action": "upgrade"}' \
  https://your-app.vercel.app/api/admin/tenants/tenant-id/subscription
```

---

## UI Access

Subscription management is available in:
- **Landlord Dashboard:** `/admin/tenants/[id]` → Subscription Management section
- **Features:**
  - View current subscription
  - Upgrade/downgrade/renew subscription
  - View billing history
  - See expiration dates

---

## Future Enhancements

- [ ] Prorated billing for mid-cycle changes
- [ ] Payment gateway integration
- [ ] Automated payment retry
- [ ] Email notifications for expiry warnings
- [ ] Detailed payment logs table
- [ ] Subscription analytics dashboard

---

**Last Updated:** 2024

