# Subscription Email FAQ

**Last Updated:** 2024

This document answers common questions about subscription management emails and payment reminders.

---

## Q1: Where is the expiry date stored?

**Answer:** The expiry date is stored in the `tenants` table in the `expire_date` column (TIMESTAMP type).

**Database Location:**
- **Table:** `tenants`
- **Column:** `expire_date` (TIMESTAMP)
- **Nullable:** Yes (null means lifetime subscription)

**When it's updated:**
- When a subscription is created or renewed
- When a plan is upgraded or downgraded
- When a payment is processed

**Example Query:**
```sql
SELECT id, name, expire_date, status 
FROM tenants 
WHERE expire_date IS NOT NULL;
```

---

## Q2: What happens after the expiry date?

**Answer:** The system follows a 7-day grace period workflow:

### Timeline:

1. **Before Expiry (Active Status)**
   - Tenant has full access
   - Status: `active`
   - Payment reminders sent 7 days before expiry

2. **On Expiry Date (Day 0)**
   - Status changes to `expired`
   - Tenant still has access (grace period begins)
   - Expiry checker cron runs daily at midnight UTC

3. **During Grace Period (Days 1-7)**
   - Status remains `expired`
   - Access is still granted (no suspension)
   - **Daily payment reminder emails are sent** (if configured)
   - Tenant can renew at any time

4. **After Grace Period (Day 8+)**
   - Status changes to `suspended`
   - Access is blocked
   - Tenant must renew to restore access

### Visual Workflow:

```
┌─────────┐      ┌──────────┐      ┌───────────┐
│ Active  │ ───> │ Expired  │ ───> │ Suspended │
│         │      │ (0-7 days)│      │ (>7 days) │
│ Full    │      │ Grace    │      │ No Access │
│ Access  │      │ Period   │      │           │
└─────────┘      └──────────┘      └───────────┘
```

### Configuration:

The grace period is configurable via environment variable:
```env
SUBSCRIPTION_GRACE_PERIOD_DAYS=7
```

---

## Q3: Is Subscription Renewal Reminder the same as Payment Due Reminder?

**Answer:** No, they are different email types with different purposes:

### Subscription Renewal Reminder

- **Purpose:** Reminds tenant to renew their subscription before it expires
- **When Sent:** 7 days before expiry date (once)
- **Content:** 
  - Subscription expiration notice
  - Days until expiry
  - Renewal instructions
  - Link to renew subscription
- **Email Function:** `sendSubscriptionRenewalReminderEmail()`
- **Subject:** "Subscription Renewal Reminder - Expires in X days"

### Payment Due Reminder

- **Purpose:** Reminds tenant that payment is due for their subscription
- **When Sent:** 
  - 7 days before expiry (once)
  - **Daily during grace period** (days 1-7 after expiry)
- **Content:**
  - Payment amount due
  - Due date
  - Payment link
  - Urgency message
- **Email Function:** `sendPaymentDueReminderEmail()`
- **Subject:** "Payment Due Reminder - $X.XX"

### Key Differences:

| Feature | Renewal Reminder | Payment Due Reminder |
|---------|----------------|---------------------|
| Purpose | Renew subscription | Make payment |
| Frequency | Once (7 days before) | Daily during grace period |
| Focus | Expiration warning | Payment urgency |
| Sent When | Before expiry | Before & after expiry |

---

## Q4: Why haven't I received emails for the payment due date?

**Answer:** Here are common reasons and solutions:

### Common Issues:

1. **Cron Job Not Running**
   - **Check:** Verify `vercel.json` has payment-reminders cron configured
   - **Solution:** Ensure cron job is scheduled: `"0 9 * * *"` (9 AM UTC daily)

2. **Email Service Not Configured**
   - **Check:** Verify SendGrid API key in environment variables
   - **Solution:** Set `SENDGRID_API_KEY` in Vercel environment variables

3. **Tenant Email Missing**
   - **Check:** Verify `tenants.contact_email` field is populated
   - **Solution:** Update tenant record with contact email

4. **Subscription Not Expiring**
   - **Check:** Verify `expire_date` is within 7 days or in grace period
   - **Solution:** Check tenant's `expire_date` value

5. **Reminder Already Sent Today**
   - **Check:** System tracks `last_payment_reminder_date` in tenant data
   - **Solution:** Wait until next day or manually trigger reminder

6. **Tenant Status**
   - **Check:** Tenant must be `active` or `expired` (not `suspended`)
   - **Solution:** Verify tenant status in database

### Debugging Steps:

1. **Check Cron Job Logs:**
   ```bash
   # In Vercel dashboard, check cron job execution logs
   # Look for payment-reminders endpoint
   ```

2. **Manual Test:**
   ```bash
   curl -X GET \
     -H "Authorization: Bearer YOUR_CRON_SECRET_TOKEN" \
     https://your-app.vercel.app/api/admin/subscriptions/payment-reminders
   ```

3. **Check Tenant Data:**
   ```sql
   SELECT 
     id, 
     name, 
     contact_email, 
     expire_date, 
     status,
     data->'subscription'->>'last_payment_reminder_date' as last_reminder
   FROM tenants 
   WHERE id = 'tenant-id';
   ```

4. **Check Email Service:**
   - Verify SendGrid account is active
   - Check SendGrid activity logs for sent emails
   - Verify sender email is verified in SendGrid

---

## Q5: Can we send emails for each day of 7 days until the tenant pays?

**Answer:** Yes! This feature has been implemented.

### Implementation Details:

The payment reminders system now sends **daily reminders during the 7-day grace period**.

**How it works:**

1. **Before Expiry (7 days before):**
   - Sends renewal reminder (once)
   - Sends payment due reminder (once)

2. **During Grace Period (Days 1-7 after expiry):**
   - Sends payment due reminder **every day**
   - Tracks last reminder date in `tenants.data.subscription.last_payment_reminder_date`
   - Stops sending after 7 days or when tenant is suspended

3. **Tracking:**
   - Last reminder date stored in tenant data JSON
   - Reminder count tracked
   - Prevents duplicate reminders on same day

### Configuration:

The system automatically:
- Checks if reminder was sent today
- Sends reminder if not sent today
- Updates last reminder date
- Continues for 7 days after expiry

### Example Tenant Data:

```json
{
  "subscription": {
    "last_payment_reminder_date": "2024-01-15",
    "reminder_count": 5,
    "currency": "USD"
  }
}
```

### Cron Schedule:

The payment reminders cron runs **daily at 9 AM UTC**:
```json
{
  "path": "/api/admin/subscriptions/payment-reminders",
  "schedule": "0 9 * * *"
}
```

### Email Frequency:

- **Day -7 to -1:** Payment due reminder (once)
- **Day 0 (Expiry):** Expired email notification
- **Day 1-7 (Grace Period):** Payment due reminder (daily)
- **Day 8+:** No more reminders (tenant suspended)

---

## Summary

| Question | Answer |
|----------|--------|
| **Where is expiry date stored?** | `tenants.expire_date` (TIMESTAMP column) |
| **What happens after expiry?** | 7-day grace period → Suspension |
| **Renewal vs Payment reminders?** | Different emails, different purposes |
| **Why no emails received?** | Check cron, email config, tenant email, subscription status |
| **Daily reminders during grace period?** | ✅ Yes, implemented - sends daily for 7 days |

---

## Related Documentation

- [Subscription Management Guide](./SUBSCRIPTION_MANAGEMENT.md)
- [Background Jobs Guide](./DAY_39_40_BACKGROUND_JOBS.md)
- [Email Service Documentation](./UNIFIED_EMAIL_SERVICE.md)

---

**Last Updated:** 2024
