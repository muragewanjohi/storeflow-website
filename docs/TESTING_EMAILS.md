# Testing Subscription Reminder Emails

## Understanding the Tests

### Unit Tests (Mocked)

The unit tests in `__tests__/` **mock** the email functions, meaning they:
- ✅ Verify the logic is correct (who gets emails, when, etc.)
- ✅ Test payment status detection
- ✅ Test duplicate prevention
- ❌ **Do NOT actually send emails**

This is intentional - unit tests should be fast and not depend on external services.

### Integration Tests (Real Emails)

To test **actual email sending**, you need to use one of the methods below.

---

## Method 1: Test Email Script (Recommended)

### Prerequisites

1. **Set SendGrid API Key:**
   ```env
   SENDGRID_API_KEY=your-sendgrid-api-key
   ```

2. **Verify Sender Email in SendGrid:**
   - Go to SendGrid Dashboard → Settings → Sender Authentication
   - Verify the sender email (usually `noreply@dukanest.com`)

3. **Have at least one tenant with a plan in database**

### Run the Test Script

```bash
# Test all email types
npm run test:email your-email@example.com

# Or directly with tsx
tsx scripts/test-email-sending.ts your-email@example.com
```

**What it does:**
- Sends 3 test emails to your address:
  1. Subscription Renewal Reminder
  2. Payment Due Reminder
  3. Subscription Expired

**Output:**
```
🧪 Testing Email Sending for Subscription Reminders
============================================================
✅ SendGrid API key found

📧 Using tenant: Test Tenant
📦 Plan: Basic Plan

1️⃣  Testing Renewal Reminder Email...
   ✅ Sent successfully

2️⃣  Testing Payment Due Reminder Email...
   ✅ Sent successfully

3️⃣  Testing Subscription Expired Email...
   ✅ Sent successfully

============================================================
📊 Test Summary

✅ Renewal Reminder: Sent
✅ Payment Due Reminder: Sent
✅ Subscription Expired: Sent

Total: 3 emails
Sent: 3
Failed: 0

🎉 All emails sent successfully!

📬 Check your inbox at: your-email@example.com
   (Also check spam folder if not received)
```

---

## Method 2: Test API Endpoint (Development Only)

### Prerequisites

- Same as Method 1
- Server must be running (`npm run dev`)

### Send Test Email via API

```bash
# Test renewal reminder
curl -X POST http://localhost:3000/api/admin/subscriptions/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "type": "renewal"
  }'

# Test payment due reminder
curl -X POST http://localhost:3000/api/admin/subscriptions/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "type": "payment_due"
  }'

# Test expired email
curl -X POST http://localhost:3000/api/admin/subscriptions/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "type": "expired"
  }'
```

**Response:**
```json
{
  "message": "Subscription Renewal Reminder email sent successfully",
  "email": "your-email@example.com",
  "type": "renewal",
  "skipped": false,
  "usedFallback": false
}
```

**Note:** This endpoint is **disabled in production** for security.

---

## Method 3: Manual Cron Job Trigger

### Test Payment Reminders

```bash
# Set your cron secret token
export CRON_SECRET_TOKEN=your-secret-token

# Trigger payment reminders (will send to real tenants)
curl -X GET http://localhost:3000/api/admin/subscriptions/payment-reminders \
  -H "Authorization: Bearer $CRON_SECRET_TOKEN"
```

**Important:** This will send emails to **real tenants** in your database who:
- Have subscriptions expiring within 7 days, OR
- Are in grace period (expired but not suspended)
- Have unpaid payment status

**Use with caution!** Only test with tenants you control.

---

## Method 4: Create Test Tenant

### Create a Test Tenant for Testing

1. **Create a tenant with your email:**
   ```sql
   -- Get a plan ID first
   SELECT id, name FROM price_plans LIMIT 1;

   -- Create test tenant
   INSERT INTO tenants (
     subdomain,
     name,
     plan_id,
     expire_date,
     status,
     contact_email
   ) VALUES (
     'test-email',
     'Test Email Tenant',
     'plan-id-from-above',
     NOW() + INTERVAL '5 days',  -- Expires in 5 days
     'active',
     'your-email@example.com'
   );
   ```

2. **Run payment reminders:**
   ```bash
   curl -X GET http://localhost:3000/api/admin/subscriptions/payment-reminders \
     -H "Authorization: Bearer $CRON_SECRET_TOKEN"
   ```

3. **Check your email** - you should receive renewal reminders.

---

## Troubleshooting

### Emails Not Received

1. **Check SendGrid API Key:**
   ```bash
   echo $SENDGRID_API_KEY
   # Should show your API key
   ```

2. **Check Sender Verification:**
   - Go to SendGrid Dashboard
   - Settings → Sender Authentication
   - Verify sender email is verified

3. **Check Spam Folder:**
   - Emails might be in spam/junk folder
   - Check email provider's spam settings

4. **Check SendGrid Activity:**
   - Go to SendGrid Dashboard → Activity
   - Look for your email sends
   - Check for any errors (bounces, blocks, etc.)

5. **Check Console Logs:**
   ```bash
   # When running test script, check for errors
   npm run test:email your-email@example.com
   ```

### Common Errors

**Error: "SENDGRID_API_KEY is not set"**
- Solution: Add `SENDGRID_API_KEY` to `.env.local`

**Error: "Sender identity not verified"**
- Solution: Verify sender email in SendGrid Dashboard

**Error: "Email skipped"**
- Solution: SendGrid API key not configured (check `.env.local`)

**Error: "No tenant found with a plan"**
- Solution: Create at least one tenant with a plan in database

---

## Production Testing

### Before Going to Production

1. ✅ Test all email types locally
2. ✅ Verify sender email in SendGrid
3. ✅ Test with real tenant data
4. ✅ Check email deliverability
5. ✅ Verify cron jobs are configured

### Production Checklist

- [ ] SendGrid API key set in production environment
- [ ] Sender email verified in SendGrid
- [ ] Cron jobs configured in `vercel.json`
- [ ] Test endpoint disabled (only works in dev/staging)
- [ ] Monitor SendGrid activity for first few days

---

## Summary

| Method | When to Use | Sends Real Emails? |
|--------|-------------|-------------------|
| Unit Tests | Verify logic | ❌ No (mocked) |
| Test Script | Quick testing | ✅ Yes |
| Test API Endpoint | Development testing | ✅ Yes |
| Manual Cron Trigger | Integration testing | ✅ Yes (to real tenants) |
| Production | Live system | ✅ Yes (to real tenants) |

**For quick testing:** Use `npm run test:email your-email@example.com`

**For production verification:** Create a test tenant and trigger the cron job manually.

---

**Last Updated:** 2024
