# Production Email Expectations & Landlord Management

**Last Updated:** 2024

---

## Question 1: When Should I Expect to Get Emails?

### Based on Your Production Database

Looking at your tenants table, all tenants have `expire_date` in **December 2025**:

| Tenant Expiry Date | First Email Date | Email Type |
|-------------------|------------------|------------|
| 2025-12-19 | 2025-12-12 | Renewal Reminder (starts 7 days before) |
| 2025-12-20 | 2025-12-13 | Renewal Reminder (starts 7 days before) |
| 2025-12-25 | 2025-12-18 | Renewal Reminder (starts 7 days before) |
| 2025-12-30 | 2025-12-23 | Renewal Reminder (starts 7 days before) |

### Email Timeline for Tenant Expiring 2025-12-19

```
December 12, 2025 (7 days before)
  └─> Renewal Reminder #1 sent at 9 AM UTC
  └─> (Daily for 7 days if payment is unpaid)

December 13, 2025
  └─> Renewal Reminder #2 sent at 9 AM UTC

December 14, 2025
  └─> Renewal Reminder #3 sent at 9 AM UTC

... (continues daily)

December 19, 2025 (Expiry Day)
  └─> Expiry Checker runs at midnight UTC
  └─> Marks tenant as "expired"
  └─> Sends "Subscription Expired" email
  └─> Payment Due Reminder #1 sent at 9 AM UTC

December 20, 2025 (Day 1 of grace period)
  └─> Payment Due Reminder #2 sent at 9 AM UTC

December 21, 2025 (Day 2 of grace period)
  └─> Payment Due Reminder #3 sent at 9 AM UTC
  └─> Expiry Checker runs at midnight UTC
  └─> Marks tenant as "suspended" (after grace period)
  └─> No more emails sent
```

### Important Conditions

**Emails are ONLY sent if:**
1. ✅ Payment status is **unpaid** (no payment_logs with `status = 'complete'`)
2. ✅ Subscription is within 7 days of expiry (for renewal reminders)
3. ✅ Subscription is expired but within 2-day grace period (for payment reminders)
4. ✅ Tenant status is `active` or `expired` (not `suspended`)

**If payment is already paid:**
- ❌ No renewal reminders sent
- ❌ No payment reminders sent
- ✅ Only expired notification sent (when status changes)

---

## Question 2: How Can Landlords See and Restart Services?

### Viewing Subscription Status

#### Option 1: Landlord Dashboard (Recommended)

**URL:** `/admin/tenants/[id]`

**Steps:**
1. Login as landlord
2. Go to **Admin Dashboard** → **Tenants**
3. Click on a tenant
4. Scroll to **Subscription Monitoring & Services** section

**What you'll see:**
- Current subscription plan and expiry date
- Last renewal reminder date and count
- Last payment reminder date and count
- Expected email schedule
- Manual trigger buttons

#### Option 2: Database (Supabase Studio)

**Direct access:**
1. Go to Supabase Dashboard
2. Open **Table Editor**
3. View `tenants` table
4. Check columns:
   - `expire_date` - When subscription expires
   - `status` - Current status (active/expired/suspended)
   - `data` - JSON field with reminder tracking

**Query to see all tenants:**
```sql
SELECT 
  id,
  name,
  expire_date,
  status,
  data->'subscription'->>'last_renewal_reminder_date' as last_renewal,
  data->'subscription'->>'last_payment_reminder_date' as last_payment
FROM tenants
ORDER BY expire_date ASC;
```

### Restarting Services

#### Understanding "Restart" in Serverless Environment

In Vercel (serverless), services don't need "restarting" like traditional servers. Instead:

1. **Cron Jobs:** Run automatically on schedule
2. **Manual Triggers:** Use dashboard buttons to run immediately
3. **Redeployment:** Only needed for code changes

#### Method 1: Manual Trigger (Recommended)

**Location:** `/admin/tenants/[id]` → **Subscription Monitoring & Services**

**Available Triggers:**
1. **Trigger Payment Reminders**
   - Immediately sends renewal/payment reminders
   - Processes all eligible tenants
   - Updates reminder tracking

2. **Trigger Expiry Checker**
   - Immediately checks for expired subscriptions
   - Updates tenant statuses
   - Sends expired notifications

**How to use:**
1. Go to tenant settings page
2. Scroll to **Subscription Monitoring & Services**
3. Click the trigger button
4. See success message with results

#### Method 2: Wait for Next Cron Run

**Automatic Schedule:**
- **Payment Reminders:** Daily at 9 AM UTC
- **Expiry Checker:** Daily at midnight UTC

**No action needed** - services run automatically.

#### Method 3: API Call (Advanced)

**Payment Reminders:**
```bash
curl -X POST https://your-app.vercel.app/api/admin/subscriptions/manual-trigger \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"service": "payment-reminders"}'
```

**Expiry Checker:**
```bash
curl -X POST https://your-app.vercel.app/api/admin/subscriptions/manual-trigger \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"service": "expiry-checker"}'
```

**Note:** Requires landlord authentication (cookie-based).

---

## Monitoring Email Status

### Check Reminder Status

**In Dashboard:**
- Go to `/admin/tenants/[id]`
- See **Email Reminder Status** section
- Shows last reminder dates and counts

**In Database:**
```sql
SELECT 
  name,
  expire_date,
  data->'subscription'->>'last_renewal_reminder_date' as last_renewal,
  data->'subscription'->>'renewal_reminder_count' as renewal_count,
  data->'subscription'->>'last_payment_reminder_date' as last_payment,
  data->'subscription'->>'payment_reminder_count' as payment_count
FROM tenants
WHERE id = 'tenant-id';
```

### Check Payment Status

**In Database:**
```sql
SELECT 
  status,
  created_at,
  amount
FROM payment_logs
WHERE tenant_id = 'tenant-id'
ORDER BY created_at DESC
LIMIT 1;
```

**Status meanings:**
- `complete` → Paid (no emails sent)
- `trial` → Paid (no emails sent)
- `pending` → Unpaid (emails will be sent)
- No record → Unpaid (emails will be sent)

---

## Quick Answers

### When will I get emails?

**Answer:** Based on your production database showing `expire_date` in December 2025:

- **Renewal Reminders:** Start **7 days before expiry** (around December 12-23, 2025)
- **Payment Reminders:** Start **on expiry day** (December 19-30, 2025)
- **Until then:** No emails (subscriptions are too far in the future)

### How to see subscription status?

**Answer:** 
1. **Dashboard:** `/admin/tenants/[id]` → Subscription Management section
2. **Database:** Supabase Studio → `tenants` table

### How to restart services?

**Answer:**
1. **Manual Trigger:** Use buttons in `/admin/tenants/[id]` → Subscription Monitoring section
2. **Wait for Cron:** Services run automatically (9 AM UTC for reminders, midnight UTC for expiry)
3. **No restart needed:** Services are serverless and run automatically

---

## Testing Emails Immediately

If you want to test emails without waiting until December:

### Option 1: Update Expiry Date

```sql
-- Set expiry to 5 days from now
UPDATE tenants
SET expire_date = NOW() + INTERVAL '5 days'
WHERE id = 'your-tenant-id';
```

Then manually trigger payment reminders.

### Option 2: Use Test Script

```bash
npm run test:email your-email@example.com
```

This sends test emails immediately (doesn't require expiry date).

---

## Summary

| Question | Answer |
|----------|--------|
| **When will emails be sent?** | 7 days before expiry (renewal) or on expiry day (payment) |
| **For your tenants:** | Starting around December 12, 2025 (7 days before earliest expiry) |
| **How to view status?** | `/admin/tenants/[id]` → Subscription Monitoring section |
| **How to restart services?** | Use manual trigger buttons or wait for next cron run (automatic) |
| **Do I need to restart?** | No - services run automatically via cron jobs |

---

**Related Documentation:**
- [Subscription Management Guide](./SUBSCRIPTION_MANAGEMENT.md)
- [Subscription Email Schedule](./SUBSCRIPTION_EMAIL_SCHEDULE.md)
- [Landlord Subscription Management](./LANDLORD_SUBSCRIPTION_MANAGEMENT.md)

---

**Last Updated:** 2024
