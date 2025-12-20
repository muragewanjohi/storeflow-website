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

- **Default Grace Period:** 2 days (configurable via `SUBSCRIPTION_GRACE_PERIOD_DAYS`)
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
SUBSCRIPTION_GRACE_PERIOD_DAYS=2
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
SUBSCRIPTION_GRACE_PERIOD_DAYS=2  # Grace period in days (default: 2)

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

## FAQ: Subscription Management

### Q: Where is the expiry date stored?

**A:** The expiry date is stored in the `tenants` table in the `expire_date` column (TIMESTAMP type). This field is automatically updated when:
- A subscription is created or renewed
- A plan is upgraded or downgraded
- A payment is processed

**Database Schema:**
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  expire_date TIMESTAMP,  -- Subscription expiration date
  plan_id UUID REFERENCES price_plans(id),
  status VARCHAR(50) DEFAULT 'active',
  ...
);
```

### Q: What happens after the expiry date?

**A:** The system follows a grace period workflow:

1. **On Expiry Date:**
   - Tenant status changes from `active` to `expired`
   - Tenant still has access to their account (grace period)
   - Expiry checker cron job runs daily at midnight UTC

2. **During Grace Period (2 days):**
   - Tenant remains in `expired` status
   - Access is still granted (no suspension)
   - Payment reminder emails are sent daily (if payment is unpaid)
   - Tenant can renew at any time

3. **After Grace Period (>2 days expired):**
   - Tenant status changes to `suspended`
   - Access is blocked
   - Tenant must renew to restore access

**Workflow:**
```
Active → Expired (0-7 days) → Suspended (>7 days)
   ↓           ↓                      ↓
  Full      Grace Period         No Access
 Access    (Can Renew)
```

### Q: Is Subscription Renewal Reminder the same as Payment Due Reminder?

**A:** No, they are different email types:

1. **Subscription Renewal Reminder:**
   - Purpose: Reminds tenant to renew their subscription
   - Sent: **Daily for 7 days before expiry** (only if payment is unpaid)
   - Content: Subscription expiration notice, renewal instructions
   - Email function: `sendSubscriptionRenewalReminderEmail()`
   - **Note:** Stops sending if payment is received

2. **Payment Due Reminder:**
   - Purpose: Reminds tenant that payment is due
   - Sent: **Daily during grace period (2 days after expiry)** (only if payment is unpaid)
   - Content: Payment amount, due date, payment link
   - Email function: `sendPaymentDueReminderEmail()`
   - **Note:** Stops sending if payment is received or tenant is suspended

**Current Behavior:**
- Renewal reminders sent daily for 7 days before expiry (if unpaid)
- Payment reminders sent daily during 2-day grace period (if unpaid)
- Both reminders check payment status before sending
- Reminders are tracked to prevent duplicates on the same day

### Q: Why haven't I received emails for the payment due date?

**A:** Payment reminder emails are sent by the cron job at `/api/admin/subscriptions/payment-reminders` which runs daily at 9 AM UTC. Common reasons for not receiving emails:

1. **Cron job not configured:** Check `vercel.json` has the payment-reminders cron job
2. **Email not configured:** Verify SendGrid API key is set in environment variables
3. **Tenant email missing:** Check `tenants.contact_email` field is populated
4. **Subscription not expiring:** Emails only sent when `expire_date` is within 7 days
5. **Already sent:** Current implementation sends once per tenant (not daily during grace period)

**To enable daily reminders during grace period:** See "Daily Payment Reminders" section below.

### Q: Can we send emails for each day of 7 days until the tenant pays?

**A:** Yes! The system can be configured to send daily payment reminders during the grace period. See the "Daily Payment Reminders" section below.

---

## Daily Payment Reminders

### Current Implementation

The payment reminders cron job (`/api/admin/subscriptions/payment-reminders`) currently:
- Runs daily at 9 AM UTC
- **Renewal Reminders:** Sends daily for 7 days before expiry (only if payment is unpaid)
- **Payment Due Reminders:** Sends daily during grace period (2 days after expiry, only if payment is unpaid)
- Tracks last reminder date to prevent duplicates on the same day
- Checks payment status from `payment_logs` table before sending

### Enhanced Implementation (Daily Reminders)

To send daily reminders during the 7-day grace period, the system needs to track which day's reminder has been sent. This can be implemented by:

1. **Adding a reminder tracking field** to track last reminder sent date
2. **Modifying the payment reminders cron** to send daily during grace period
3. **Stopping reminders** once payment is received or tenant is suspended

**Implementation Options:**

**Option 1: Track in tenant data (JSON field)**
```typescript
// Store last reminder date in tenants.data JSON
{
  "subscription": {
    "last_payment_reminder_date": "2024-01-15",
    "reminder_count": 3
  }
}
```

**Option 2: Create separate reminder log table**
```sql
CREATE TABLE payment_reminder_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  reminder_date DATE,
  reminder_type VARCHAR(50), -- 'renewal' or 'payment_due'
  sent_at TIMESTAMP DEFAULT NOW()
);
```

**Option 3: Use existing payment_logs table**
- Check if payment was made after last reminder
- If no payment, send next day's reminder

### Implementation Details

The system uses **Option 1** (track in tenant data). The payment reminders cron job:
1. Checks payment status from `payment_logs` table (status = 'complete' or 'trial' = paid)
2. For renewal reminders: Checks if subscription expires within 7 days and payment is unpaid
3. For payment reminders: Checks if tenant is in grace period (0-2 days expired) and payment is unpaid
4. Checks last reminder date from `tenants.data.subscription.last_renewal_reminder_date` or `last_payment_reminder_date`
5. If last reminder was yesterday (or never sent), sends today's reminder
6. Updates last reminder date and increments reminder count
7. Stops sending after grace period ends (tenant suspended) or payment is received

---

## Testing

### Running Tests

The subscription management system includes comprehensive tests:

```bash
# Run all subscription tests
npm test -- subscriptions

# Run specific test files
npm test -- expiry-checker.test.ts
npm test -- payment-reminders.test.ts

# Run with coverage
npm run test:coverage -- subscriptions
```

### Test Coverage

- **Expiry Checker Tests:** Authentication, grace period logic, email notifications, edge cases
- **Payment Reminders Tests:** Renewal reminders, payment due reminders, payment status detection, daily tracking

### Manual Testing

See the "Testing" section above for manual testing commands.

---

## Future Enhancements

- [x] Email notifications for expiry warnings (✅ Implemented)
- [x] **Daily payment reminders during grace period** (✅ Implemented)
- [x] **Daily renewal reminders before expiry** (✅ Implemented)
- [ ] Prorated billing for mid-cycle changes
- [ ] Payment gateway integration
- [ ] Automated payment retry
- [ ] Detailed payment logs table
- [ ] Subscription analytics dashboard

---

**Last Updated:** 2024

