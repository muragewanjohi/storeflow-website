# Landlord Subscription Management Guide

**Last Updated:** 2024

---

## Overview

As a landlord (platform administrator), you can monitor and manage tenant subscriptions through the admin dashboard. This guide explains how to view subscription status, monitor email reminders, and manually trigger subscription services.

---

## Accessing Subscription Management

### Landlord Dashboard

**URL:** `/admin/tenants/[id]`

**Navigation:**
1. Go to **Admin Dashboard** → **Tenants**
2. Click on a tenant to view their details
3. Scroll to **Subscription Management** section

**Features Available:**
- View current subscription plan
- See expiration date
- Upgrade/downgrade/renew subscriptions
- View billing history
- **Monitor email reminder status** (new)
- **Manually trigger subscription services** (new)

---

## Monitoring Email Reminders

### Email Reminder Status

In the **Subscription Monitoring & Services** section, you can see:

1. **Last Renewal Reminder:**
   - Date when last renewal reminder was sent
   - Count of renewal reminders sent

2. **Last Payment Reminder:**
   - Date when last payment reminder was sent
   - Count of payment reminders sent

3. **Expected Email Schedule:**
   - When renewal reminders will start (7 days before expiry)
   - When payment reminders will start (on expiry day)
   - When tenant will be suspended (2 days after expiry)

### Understanding the Schedule

**Example:** Tenant expires on **December 19, 2025**

- **Renewal Reminders:** Start December 12, 2025 (daily for 7 days)
- **Payment Reminders:** Start December 19, 2025 (daily for 2 days)
- **Suspension:** December 21, 2025 (after grace period)

**Note:** Emails are only sent if payment is unpaid. Check payment status in billing history.

---

## Manual Service Triggers

### When to Use Manual Triggers

Use manual triggers when:
- Testing subscription reminders
- Processing subscriptions immediately (without waiting for cron)
- Troubleshooting email delivery issues
- Verifying cron job functionality

### Available Triggers

#### 1. Trigger Payment Reminders

**What it does:**
- Sends renewal reminders to tenants expiring within 7 days (if unpaid)
- Sends payment reminders to tenants in grace period (if unpaid)
- Updates reminder tracking dates

**When to use:**
- Test email sending
- Process reminders immediately
- Verify email configuration

**How to trigger:**
1. Go to tenant settings page (`/admin/tenants/[id]`)
2. Scroll to **Subscription Monitoring & Services**
3. Click **Trigger Payment Reminders** button

**Expected result:**
- Shows success message with count of emails sent
- Updates last reminder dates in tenant data

#### 2. Trigger Expiry Checker

**What it does:**
- Checks for expired subscriptions
- Applies grace period logic (2 days)
- Updates tenant status (expired → suspended)
- Sends expired email notifications

**When to use:**
- Test expiry logic
- Process expirations immediately
- Verify status updates

**How to trigger:**
1. Go to tenant settings page (`/admin/tenants/[id]`)
2. Scroll to **Subscription Monitoring & Services**
3. Click **Trigger Expiry Checker** button

**Expected result:**
- Shows success message with count of expired/suspended tenants
- Updates tenant statuses

---

## Viewing Subscription Status

### In Tenant Settings Page

**Location:** `/admin/tenants/[id]`

**Information displayed:**
- Current plan name and price
- Expiration date
- Subscription status (active/expired/suspended)
- Plan limits and usage
- Billing history

### In Database (Supabase Studio)

**Direct database access:**
1. Go to Supabase Dashboard
2. Open **Table Editor**
3. View `tenants` table
4. Check `expire_date` column

**Query example:**
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

---

## Understanding Email Schedule

### For Your Current Tenants

Based on your production database showing tenants with `expire_date` in **December 2025**:

**You will receive emails starting:**

| Tenant Expiry | Renewal Reminders Start | Payment Reminders Start | Suspension Date |
|---------------|------------------------|------------------------|-----------------|
| 2025-12-19 | 2025-12-12 | 2025-12-19 | 2025-12-21 |
| 2025-12-20 | 2025-12-13 | 2025-12-20 | 2025-12-22 |
| 2025-12-25 | 2025-12-18 | 2025-12-25 | 2025-12-27 |
| 2025-12-30 | 2025-12-23 | 2025-12-30 | 2026-01-01 |

**Until then:** No emails will be sent because subscriptions are not yet expiring.

### Automatic Cron Schedule

**Payment Reminders:**
- Runs daily at **9 AM UTC**
- Sends to tenants expiring within 7 days OR in grace period
- Only if payment is unpaid

**Expiry Checker:**
- Runs daily at **midnight UTC**
- Updates tenant statuses
- Sends expired notifications

---

## Restarting Services

### What "Restarting Services" Means

In a serverless environment (Vercel), you don't "restart" services like traditional servers. Instead:

1. **Cron Jobs:** Run automatically on schedule (no restart needed)
2. **Manual Triggers:** Use the buttons in the dashboard
3. **Redeployment:** Only needed for code changes

### How to "Restart" Subscription Services

#### Option 1: Manual Trigger (Recommended)

Use the manual trigger buttons in the tenant settings page:
- **Trigger Payment Reminders** - Immediately processes reminders
- **Trigger Expiry Checker** - Immediately checks expirations

#### Option 2: Wait for Next Cron Run

Cron jobs run automatically:
- Payment reminders: Next run at 9 AM UTC
- Expiry checker: Next run at midnight UTC

#### Option 3: Redeploy Application

If you need to restart the entire application:
1. Go to Vercel Dashboard
2. Select your project
3. Click **Redeploy** (only if code changed)

**Note:** Redeployment is NOT needed for subscription services - they run automatically via cron.

---

## Troubleshooting

### Emails Not Being Sent

1. **Check tenant expire_date:**
   ```sql
   SELECT expire_date FROM tenants WHERE id = 'tenant-id';
   ```
   - Must be within 7 days for renewal reminders
   - Must be expired (within 2 days) for payment reminders

2. **Check payment status:**
   ```sql
   SELECT status FROM payment_logs 
   WHERE tenant_id = 'tenant-id' 
   ORDER BY created_at DESC LIMIT 1;
   ```
   - If `status = 'complete'` → No emails (payment is paid)
   - If `status = 'pending'` or NULL → Emails will be sent

3. **Check SendGrid configuration:**
   - Verify `SENDGRID_API_KEY` is set in production
   - Verify sender email is verified in SendGrid
   - Check SendGrid activity logs

4. **Manually trigger:**
   - Use "Trigger Payment Reminders" button
   - Check for error messages

### Cron Jobs Not Running

1. **Check Vercel Cron Configuration:**
   - Verify `vercel.json` has cron jobs configured
   - Check Vercel dashboard → Cron Jobs section

2. **Check Environment Variables:**
   - `CRON_SECRET_TOKEN` must be set
   - `SENDGRID_API_KEY` must be set

3. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Deployments → Functions
   - Check cron job execution logs

4. **Manual Test:**
   - Use manual trigger buttons to test
   - If manual works, cron should work too

---

## Quick Reference

### Email Schedule Calculator

```javascript
// Renewal reminders start
const renewalStart = new Date(expireDate);
renewalStart.setDate(renewalStart.getDate() - 7);

// Payment reminders start (on expiry)
const paymentStart = new Date(expireDate);

// Suspension date (after grace period)
const suspensionDate = new Date(expireDate);
suspensionDate.setDate(suspensionDate.getDate() + 2);
```

### Manual Trigger URLs

**Payment Reminders:**
```
GET /api/admin/subscriptions/payment-reminders
Authorization: Bearer YOUR_CRON_SECRET_TOKEN
```

**Expiry Checker:**
```
GET /api/admin/subscriptions/expiry-checker
Authorization: Bearer YOUR_CRON_SECRET_TOKEN
```

---

## Summary

| Question | Answer |
|----------|--------|
| **When will I get emails?** | 7 days before expiry (renewal) or on expiry day (payment) |
| **How to see subscription status?** | `/admin/tenants/[id]` → Subscription Management section |
| **How to restart services?** | Use manual trigger buttons or wait for next cron run |
| **How to test emails?** | Use "Trigger Payment Reminders" button or update expire_date to near future |

---

**Last Updated:** 2024
