# Subscription Reminders Update

**Date:** 2024  
**Changes:** Grace period reduced to 2 days, daily renewal reminders implemented

---

## Summary of Changes

### 1. Grace Period: 7 days → 2 days

- **Changed:** Default grace period reduced from 7 days to 2 days
- **Files Updated:**
  - `src/app/api/admin/subscriptions/expiry-checker/route.ts`
  - `src/app/api/admin/subscriptions/payment-reminders/route.ts`
  - `docs/SUBSCRIPTION_MANAGEMENT.md`

**Configuration:**
```env
SUBSCRIPTION_GRACE_PERIOD_DAYS=2  # Default: 2 days
```

### 2. Daily Renewal Reminders (7 days before expiry)

- **Changed:** Renewal reminders now sent **daily** for 7 days before expiry (instead of once)
- **Condition:** Only sent if payment status is **unpaid**
- **Tracking:** Tracks `last_renewal_reminder_date` to prevent duplicates

**Behavior:**
- Days -7 to -1 before expiry: Sends renewal reminder daily (if unpaid)
- Stops sending if payment is received
- Tracks reminder count in `tenants.data.subscription.renewal_reminder_count`

### 3. Payment Status Detection

- **Added:** Payment status checking from `payment_logs` table
- **Logic:** 
  - `status = 'complete'` → Paid
  - `status = 'trial'` → Paid
  - `status = 'pending'` or no payment → Unpaid
- **Impact:** Reminders only sent if payment is unpaid

### 4. Daily Payment Reminders (Grace Period)

- **Maintained:** Payment due reminders sent daily during grace period (2 days)
- **Condition:** Only sent if payment status is **unpaid**
- **Tracking:** Tracks `last_payment_reminder_date` to prevent duplicates

**Behavior:**
- Days 0-2 after expiry: Sends payment due reminder daily (if unpaid)
- Stops sending if payment is received or tenant is suspended
- Tracks reminder count in `tenants.data.subscription.payment_reminder_count`

---

## Implementation Details

### Payment Reminders Route

**File:** `src/app/api/admin/subscriptions/payment-reminders/route.ts`

**Key Changes:**
1. Fetches latest payment logs for all tenants
2. Creates payment status map (tenant_id → isPaid)
3. Checks payment status before sending any reminders
4. Tracks separate dates for renewal and payment reminders
5. Sends renewal reminders daily for 7 days before expiry (if unpaid)
6. Sends payment reminders daily during grace period (if unpaid)

**Data Structure:**
```typescript
tenants.data = {
  subscription: {
    last_renewal_reminder_date: "2024-01-15",  // YYYY-MM-DD
    renewal_reminder_count: 3,
    last_payment_reminder_date: "2024-01-16",  // YYYY-MM-DD
    payment_reminder_count: 2,
  }
}
```

### Expiry Checker Route

**File:** `src/app/api/admin/subscriptions/expiry-checker/route.ts`

**Key Changes:**
1. Grace period default changed from 7 to 2 days
2. Logic remains the same (marks expired → suspended after grace period)

---

## Testing

### Unit Tests

**Files Created:**
- `src/app/api/admin/subscriptions/__tests__/expiry-checker.test.ts`
- `src/app/api/admin/subscriptions/__tests__/payment-reminders.test.ts`

**Test Coverage:**
- Authentication
- Grace period logic (2 days)
- Renewal reminders (daily for 7 days, unpaid only)
- Payment reminders (daily during grace period, unpaid only)
- Payment status detection
- Duplicate prevention
- Edge cases

**Run Tests:**
```bash
# Run all subscription tests
npm test -- subscriptions

# Run specific test files
npm test -- expiry-checker.test.ts
npm test -- payment-reminders.test.ts

# Run with coverage
npm run test:coverage -- subscriptions
```

### Manual Testing Script

**File:** `scripts/test-subscription-reminders.ts`

**Features:**
- Creates test tenants with different scenarios
- Tests both endpoints
- Validates authentication
- Checks grace period configuration
- Provides test summary

**Run Script:**
```bash
npm run test:subscriptions
```

**Test Tenants Created:**
1. `test-expiring-5days` - Expires in 5 days (should get renewal reminders)
2. `test-expired-1day` - Expired 1 day ago (should get payment reminders)
3. `test-expired-3days` - Expired 3 days ago (should be suspended)

---

## Email Flow

### Before Expiry (Days -7 to -1)

```
Day -7: Renewal Reminder (if unpaid)
Day -6: Renewal Reminder (if unpaid)
Day -5: Renewal Reminder (if unpaid)
Day -4: Renewal Reminder (if unpaid)
Day -3: Renewal Reminder (if unpaid)
Day -2: Renewal Reminder (if unpaid)
Day -1: Renewal Reminder (if unpaid)
```

### On Expiry (Day 0)

```
Expiry Checker runs:
- Marks tenant as "expired"
- Sends expired email notification
```

### Grace Period (Days 1-2)

```
Day 1: Payment Due Reminder (if unpaid)
Day 2: Payment Due Reminder (if unpaid)
```

### After Grace Period (Day 3+)

```
Expiry Checker runs:
- Marks tenant as "suspended"
- No more reminders sent
```

---

## Configuration

### Environment Variables

```env
# Grace Period (days)
SUBSCRIPTION_GRACE_PERIOD_DAYS=2

# Cron Job Security
CRON_SECRET_TOKEN=your-secret-token-here

# Email Service
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Cron Schedule

**vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/admin/subscriptions/expiry-checker",
      "schedule": "0 0 * * *"  // Daily at midnight UTC
    },
    {
      "path": "/api/admin/subscriptions/payment-reminders",
      "schedule": "0 9 * * *"  // Daily at 9 AM UTC
    }
  ]
}
```

---

## Migration Notes

### Database Changes

No database schema changes required. The system uses existing:
- `tenants.expire_date` - Expiration date
- `tenants.data` (JSONB) - Reminder tracking
- `payment_logs.status` - Payment status

### Data Migration

Existing tenants will automatically use the new grace period (2 days) on next expiry check.

To reset reminder tracking for a tenant:
```sql
UPDATE tenants
SET data = jsonb_set(
  data,
  '{subscription}',
  '{}'::jsonb
)
WHERE id = 'tenant-id';
```

---

## Verification Checklist

- [x] Grace period changed to 2 days
- [x] Renewal reminders sent daily for 7 days before expiry
- [x] Payment reminders sent daily during grace period
- [x] Payment status detection implemented
- [x] Duplicate prevention (same day tracking)
- [x] Unit tests created
- [x] Manual test script created
- [x] Documentation updated

---

## Related Documentation

- [Subscription Management Guide](./SUBSCRIPTION_MANAGEMENT.md)
- [Subscription Email FAQ](./SUBSCRIPTION_EMAIL_FAQ.md)
- [Background Jobs Guide](./DAY_39_40_BACKGROUND_JOBS.md)

---

**Last Updated:** 2024
