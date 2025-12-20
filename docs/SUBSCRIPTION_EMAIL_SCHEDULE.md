# Subscription Email Schedule Guide

**Last Updated:** 2024

---

## When Will I Receive Emails?

Based on your tenant's `expire_date` in the database, here's when you can expect emails:

### Email Timeline

| Tenant Expiry Date | Renewal Reminders Start | Payment Reminders Start | Suspension Date |
|-------------------|------------------------|------------------------|-----------------|
| 2025-12-19 | 2025-12-12 (7 days before) | 2025-12-19 (on expiry) | 2025-12-21 (2 days after) |
| 2025-12-20 | 2025-12-13 (7 days before) | 2025-12-20 (on expiry) | 2025-12-22 (2 days after) |
| 2025-12-25 | 2025-12-18 (7 days before) | 2025-12-25 (on expiry) | 2025-12-27 (2 days after) |
| 2025-12-30 | 2025-12-23 (7 days before) | 2025-12-30 (on expiry) | 2026-01-01 (2 days after) |

### Important Notes

1. **Emails only sent if payment is unpaid:**
   - System checks `payment_logs` table for latest payment
   - If `status = 'complete'` or `'trial'` → No emails sent
   - If `status = 'pending'` or no payment → Emails sent

2. **Cron job schedule:**
   - **Payment Reminders:** Runs daily at **9 AM UTC**
   - **Expiry Checker:** Runs daily at **midnight UTC**

3. **Current Status:**
   - If all your tenants have `expire_date` in December 2025
   - And today is before December 2025
   - **You will NOT receive emails yet** - they're too far in the future

---

## Email Schedule Details

### Renewal Reminders (7 Days Before Expiry)

**When:** Daily for 7 days before `expire_date`  
**Condition:** Only if payment is unpaid  
**Frequency:** Once per day  
**Stops:** When payment is received

**Example for tenant expiring 2025-12-19:**
- Day -7 (2025-12-12): Renewal reminder sent at 9 AM UTC
- Day -6 (2025-12-13): Renewal reminder sent at 9 AM UTC
- Day -5 (2025-12-14): Renewal reminder sent at 9 AM UTC
- Day -4 (2025-12-15): Renewal reminder sent at 9 AM UTC
- Day -3 (2025-12-16): Renewal reminder sent at 9 AM UTC
- Day -2 (2025-12-17): Renewal reminder sent at 9 AM UTC
- Day -1 (2025-12-18): Renewal reminder sent at 9 AM UTC

### Payment Due Reminders (Grace Period)

**When:** Daily during grace period (2 days after expiry)  
**Condition:** Only if payment is unpaid  
**Frequency:** Once per day  
**Stops:** When payment is received or tenant is suspended

**Example for tenant expiring 2025-12-19:**
- Day 0 (2025-12-19): Expiry checker runs at midnight UTC, marks as "expired", sends expired email
- Day 1 (2025-12-20): Payment due reminder sent at 9 AM UTC
- Day 2 (2025-12-21): Payment due reminder sent at 9 AM UTC
- Day 3 (2025-12-22): Expiry checker runs at midnight UTC, marks as "suspended", no more emails

---

## How to Check When Emails Will Be Sent

### Method 1: Calculate from Expiry Date

```javascript
// Renewal reminders start: expire_date - 7 days
// Payment reminders start: expire_date (on expiry day)
// Suspension: expire_date + 2 days (grace period)
```

### Method 2: Check Tenant Data

Query the database to see reminder tracking:

```sql
SELECT 
  id,
  name,
  expire_date,
  status,
  data->'subscription'->>'last_renewal_reminder_date' as last_renewal,
  data->'subscription'->>'last_payment_reminder_date' as last_payment,
  data->'subscription'->>'renewal_reminder_count' as renewal_count,
  data->'subscription'->>'payment_reminder_count' as payment_count
FROM tenants
WHERE id = 'your-tenant-id';
```

### Method 3: Use Landlord Dashboard

See the "Landlord Dashboard" section below for UI access.

---

## Testing Email Schedule

To test emails immediately (without waiting for expiry):

1. **Update tenant expire_date to near future:**
   ```sql
   UPDATE tenants
   SET expire_date = NOW() + INTERVAL '5 days'
   WHERE id = 'your-tenant-id';
   ```

2. **Ensure payment is unpaid:**
   ```sql
   -- Check if tenant has unpaid payment
   SELECT * FROM payment_logs 
   WHERE tenant_id = 'your-tenant-id' 
   ORDER BY created_at DESC 
   LIMIT 1;
   
   -- If payment is 'complete', you won't get emails
   -- To test, either:
   -- 1. Delete the payment log, OR
   -- 2. Set status to 'pending'
   ```

3. **Manually trigger payment reminders:**
   ```bash
   curl -X GET https://your-app.vercel.app/api/admin/subscriptions/payment-reminders \
     -H "Authorization: Bearer YOUR_CRON_SECRET_TOKEN"
   ```

---

## Current Production Status

Based on your database screenshot showing tenants with `expire_date` in December 2025:

**You will receive emails starting:**
- **Renewal Reminders:** Around December 12, 2025 (7 days before earliest expiry)
- **Payment Reminders:** Starting December 19, 2025 (on expiry day)

**Until then:** No emails will be sent because subscriptions are not yet expiring.

---

**Last Updated:** 2024
