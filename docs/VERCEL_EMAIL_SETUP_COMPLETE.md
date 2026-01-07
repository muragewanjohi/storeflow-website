# Complete Email Setup Guide for Vercel

**Last Updated:** 2024

---

## Overview

You've already set up:
- ✅ **SendGrid** - Domain verified, sending from `no-reply@dukanest.com`
- ✅ **Namecheap Private Email** - Receiving at `support@dukanest.com`

This guide helps you complete the Vercel configuration to use both services together.

**Current Setup:**
- ✅ **SendGrid** = For **sending** emails (already configured)
- ✅ **Namecheap Private Email** = For **receiving** emails at `support@dukanest.com` (already configured)

---

## Step-by-Step: Complete Email Setup on Vercel

### Part 1: Add Namecheap Private Email DNS Records to Vercel

Since you're using Vercel for DNS management, you need to add the Namecheap Private Email DNS records in Vercel (not in Namecheap).

**Required DNS Records from Namecheap:**
1. **MX Record 1:** `mx1.privateemail.com` (Priority: 10)
2. **MX Record 2:** `mx2.privateemail.com` (Priority: 10)
3. **TXT Record (SPF):** `v=spf1 include:spf.privateemail.com ~all`

#### Step 1: Add MX Records in Vercel

1. Go to Vercel Dashboard → Your Project → **Domains** tab
2. Click on your domain (`dukanest.com`)
3. Scroll to **DNS Records** section
4. Click **"Add DNS Record"** or use the form at the top

**Add First MX Record:**
- **Name:** `@` (or leave blank for root domain)
- **Type:** `MX`
- **Value:** `mx1.privateemail.com`
- **Priority:** `10`
- **TTL:** `60` (or default)
- **Comment:** `Namecheap Private Email - Primary MX`
- Click **"Add"**

**Add Second MX Record:**
- **Name:** `@` (or leave blank for root domain)
- **Type:** `MX`
- **Value:** `mx2.privateemail.com`
- **Priority:** `10`
- **TTL:** `60` (or default)
- **Comment:** `Namecheap Private Email - Secondary MX`
- Click **"Add"**

#### Step 2: Add SPF TXT Record in Vercel

**Important:** Check if you already have an SPF record. If you do, you need to combine it with the Namecheap SPF.

1. In the same DNS Records section
2. Click **"Add DNS Record"**

**Add SPF TXT Record:**
- **Name:** `@` (or leave blank for root domain)
- **Type:** `TXT`
- **Value:** `v=spf1 include:spf.privateemail.com ~all`
- **TTL:** `60` (or default)
- **Comment:** `Namecheap Private Email SPF`
- Click **"Add"**

**⚠️ Important Note about SPF Records:**
- You can only have **ONE SPF record** per domain
- If you already have an SPF record for SendGrid, you need to **combine** them
- Combined SPF should look like:
  ```
  v=spf1 include:sendgrid.net include:spf.privateemail.com ~all
  ```
- If you have both, delete the old one and add the combined version

#### Step 3: Wait for DNS Propagation

- DNS changes can take **5-30 minutes** to propagate
- Can take up to **4 hours** in some cases
- Check Namecheap dashboard - the yellow banner should disappear once records are detected

#### Step 4: Verify SendGrid Configuration

Since you've already set up SendGrid and verified your domain, you just need to ensure the environment variables are set in Vercel.

#### Step 1: Verify SendGrid API Key

Since your domain is already verified, you just need to ensure you have a SendGrid API key:

1. Go to SendGrid Dashboard → **Settings** → **API Keys**
2. If you don't have an API key yet, click **"Create API Key"**
3. Name it: **"StoreFlow Production"**
4. Select **"Full Access"** (or customize permissions for Mail Send)
5. **Copy the API key** (starts with `SG.` - you'll only see it once!)
6. **Save it securely** - you'll need it for Vercel

**⚠️ Important:** 
- The API key starts with `SG.` (e.g., `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
- This is different from Twilio Account SID/Auth Token
- You can only see the full key once when creating it
- If you already have an API key, you can use that one

---

### Part 2: Add Namecheap Private Email DNS Records to Vercel

Since you're using Vercel for DNS management, you need to add the Namecheap Private Email DNS records in Vercel (not in Namecheap).

**Required DNS Records from Namecheap:**
1. **MX Record 1:** `mx1.privateemail.com` (Priority: 10)
2. **MX Record 2:** `mx2.privateemail.com` (Priority: 10)
3. **TXT Record (SPF):** `v=spf1 include:spf.privateemail.com ~all`

#### Step 1: Add MX Records in Vercel

1. Go to Vercel Dashboard → Your Project → **Domains** tab
2. Click on your domain (`dukanest.com`)
3. Scroll to **DNS Records** section
4. Click **"Add DNS Record"** or use the form at the top

**Add First MX Record:**
- **Name:** `@` (or leave blank for root domain)
- **Type:** `MX`
- **Value:** `mx1.privateemail.com`
- **Priority:** `10`
- **TTL:** `60` (or default)
- **Comment:** `Namecheap Private Email - Primary MX`
- Click **"Add"**

**Add Second MX Record:**
- **Name:** `@` (or leave blank for root domain)
- **Type:** `MX`
- **Value:** `mx2.privateemail.com`
- **Priority:** `10`
- **TTL:** `60` (or default)
- **Comment:** `Namecheap Private Email - Secondary MX`
- Click **"Add"**

#### Step 2: Add SPF TXT Record in Vercel

**⚠️ Important:** You can only have **ONE SPF record** per domain. If you already have an SPF record for SendGrid, you need to **combine** them.

**Check for Existing SPF Record:**
1. Look in your DNS Records table for any `TXT` records with `v=spf1` in the value
2. If you find one, note its current value

**Option A: If you DON'T have an existing SPF record:**
- **Name:** `@` (or leave blank for root domain)
- **Type:** `TXT`
- **Value:** `v=spf1 include:spf.privateemail.com ~all`
- **TTL:** `60` (or default)
- **Comment:** `Namecheap Private Email SPF`
- Click **"Add"**

**Option B: If you DO have an existing SPF record (for SendGrid):**
1. **Delete the old SPF record** (if it only has SendGrid)
2. **Add a combined SPF record:**
   - **Name:** `@` (or leave blank for root domain)
   - **Type:** `TXT`
   - **Value:** `v=spf1 include:sendgrid.net include:spf.privateemail.com ~all`
   - **TTL:** `60` (or default)
   - **Comment:** `Combined SPF - SendGrid + Namecheap Private Email`
   - Click **"Add"**

**Why combine?** SPF records must be combined into a single record. You can't have multiple SPF records.

#### Step 3: Wait for DNS Propagation

- DNS changes can take **5-30 minutes** to propagate
- Can take up to **4 hours** in some cases
- Check Namecheap dashboard - the yellow banner should disappear once records are detected
- You can verify DNS propagation using tools like:
  - https://mxtoolbox.com/SuperTool.aspx
  - https://www.whatsmydns.net/

#### Step 4: Verify in Namecheap

1. Go back to Namecheap → Domain List → Manage → Private Email
2. The yellow banner should disappear once DNS records are detected
3. You should be able to create mailboxes (like `support@dukanest.com`)

---

### Part 3: Add Environment Variables to Vercel

#### Step 1: Go to Vercel Project Settings

1. Go to https://vercel.com
2. Select your **StoreFlow project**
3. Click **Settings** (in the top navigation)
4. Click **Environment Variables** (in the left sidebar)

#### Step 2: Add SendGrid Environment Variables

Add these three environment variables:

**Variable 1: `SENDGRID_API_KEY`**
- **Name:** `SENDGRID_API_KEY`
- **Value:** Your SendGrid API key (starts with `SG.`)
- **Environments:** ✅ Production, ✅ Preview
- Click **Save**

**Variable 2: `SENDGRID_FROM_EMAIL`**
- **Name:** `SENDGRID_FROM_EMAIL`
- **Value:** `no-reply@dukanest.com` (or `noreply@dukanest.com` - match what you verified in SendGrid)
- **Environments:** ✅ Production, ✅ Preview
- Click **Save**

**Variable 3: `SENDGRID_FROM_NAME`** (Optional but recommended)
- **Name:** `SENDGRID_FROM_NAME`
- **Value:** `DukaNest` (or your preferred name)
- **Environments:** ✅ Production, ✅ Preview
- Click **Save**

**Variable 4: `SUPPORT_EMAIL`** (Optional - for platform support)
- **Name:** `SUPPORT_EMAIL`
- **Value:** `support@dukanest.com` (your Namecheap Private Email)
- **Environments:** ✅ Production, ✅ Preview
- Click **Save**
- **Note:** This is used as reply-to for platform emails. The system will use tenant contact emails for tenant-specific emails.

#### Step 3: Redeploy Your Application

**Important:** After adding environment variables, you must redeploy:

1. Go to **Deployments** tab in Vercel
2. Click the **"..."** menu on your latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger a new deployment

**Why?** Environment variables are only loaded when the application starts, so existing deployments won't have the new variables.

---

## How Email Works in Your Setup

### Sending Emails (SendGrid)
- **From Address:** `no-reply@dukanest.com` (verified in SendGrid)
- **Reply-To Address:** 
  - For tenant emails: Uses tenant's `contact_email` field (e.g., `support@tenantstore.com`)
  - For platform emails: Can use `support@dukanest.com` (your Namecheap Private Email)
- **How it works:**
  1. Email is sent FROM `no-reply@dukanest.com` (SendGrid requirement)
  2. Reply-To is set to the appropriate support email
  3. When customers reply, emails go to the Reply-To address (your Namecheap Private Email)

### Receiving Emails (Namecheap Private Email)
- **Support Email:** `support@dukanest.com`
- **How it works:**
  1. Customers reply to emails
  2. Replies go to the Reply-To address (`support@dukanest.com`)
  3. You receive them in your Namecheap Private Email inbox
  4. You can access via webmail or email client

### Tenant Contact Emails
- Each tenant can set their own `contact_email` in their settings
- This is used as the Reply-To for tenant-specific emails (order confirmations, etc.)
- If a tenant sets `support@theirstore.com`, replies go there
- If not set, defaults to `support@[subdomain].dukanest.com`

---

## Verification Checklist

After completing the setup, verify everything works:

### ✅ SendGrid Setup
- [ ] SendGrid account created
- [ ] Domain `dukanest.com` authenticated in SendGrid
- [ ] DNS records added at Vercel (SendGrid CNAME records)
- [ ] Domain verified in SendGrid (green checkmark)
- [ ] SendGrid API key created (starts with `SG.`)

### ✅ Namecheap Private Email DNS Records
- [ ] MX record 1 added to Vercel (`mx1.privateemail.com`, priority 10)
- [ ] MX record 2 added to Vercel (`mx2.privateemail.com`, priority 10)
- [ ] SPF TXT record added to Vercel (combined with SendGrid if needed)
- [ ] DNS propagation completed (checked via MX lookup tool)
- [ ] Namecheap dashboard shows records detected (yellow banner gone)

### ✅ Vercel Environment Variables
- [ ] `SENDGRID_API_KEY` added to Vercel
- [ ] `SENDGRID_FROM_EMAIL` added to Vercel (should be `no-reply@dukanest.com` or `noreply@dukanest.com`)
- [ ] `SENDGRID_FROM_NAME` added to Vercel (optional)
- [ ] `SUPPORT_EMAIL` added to Vercel (optional, set to `support@dukanest.com`)
- [ ] All variables set for Production and Preview environments
- [ ] Application redeployed after adding variables

### ✅ Namecheap Private Email
- [ ] `support@dukanest.com` mailbox created in Namecheap
- [ ] Can access webmail or configured email client
- [ ] DNS records for email receiving are set up (MX records)

### ✅ Testing
- [ ] Create a test tenant to trigger welcome email
- [ ] Check SendGrid Activity logs for sent emails
- [ ] Verify email arrives in inbox (not spam)

---

## Testing Email Sending

### Method 1: Create a Test Tenant

1. Go to your Vercel deployment: `https://your-app.vercel.app/admin/tenants/new`
2. Create a new tenant
3. Check if welcome email is sent to the admin email
4. Check SendGrid Dashboard → **Activity** to see email status

### Method 2: Use SendGrid Activity Dashboard

1. Go to SendGrid Dashboard → **Activity**
2. You'll see all sent emails with status:
   - ✅ **Delivered** - Email reached inbox
   - ⚠️ **Bounced** - Email address invalid
   - ⚠️ **Blocked** - Email blocked by recipient
   - ⚠️ **Deferred** - Temporary issue, will retry

---

## Troubleshooting

### ❌ "SendGrid API key not configured" Error

**Solution:**
1. Verify `SENDGRID_API_KEY` is set in Vercel
2. Check the API key starts with `SG.`
3. Make sure you redeployed after adding the variable
4. Check Vercel deployment logs for errors

### ❌ "Domain not verified" Error

**Solution:**
1. Check DNS records are added correctly at Namecheap
2. Wait for DNS propagation (can take up to 48 hours)
3. Verify domain in SendGrid Dashboard
4. Check DNS records match exactly what SendGrid provided

### ❌ "Email not sending" Error

**Solution:**
1. Check SendGrid API key is correct
2. Verify domain is authenticated
3. Check SendGrid account limits (free tier: 100/day)
4. Check SendGrid Activity logs for error details
5. Verify `SENDGRID_FROM_EMAIL` matches verified domain

### ❌ "Emails going to spam"

**Solution:**
1. Ensure domain authentication is complete (SPF/DKIM records)
2. Use a reputable email service (SendGrid is good)
3. Avoid spam trigger words in subject lines
4. SendGrid automatically sets up SPF/DKIM when you authenticate domain

---

## Cost Summary

### Current Setup:
- **Sending Emails:** SendGrid Free Tier (100 emails/day) = **$0/month** ✅
- **Receiving Emails:** Namecheap Email Forwarding (free for 3 addresses) = **$0/month** ✅
- **Total:** **$0/month** ✅

### When You Scale:
- **Sending Emails:** SendGrid Pro ($89.95/month for 100,000 emails) = **$89.95/month**
- **Receiving Emails:** Namecheap Email Forwarding (still free) = **$0/month**
- **Total:** **$89.95/month**

---

## Quick Reference: Environment Variables

Add these to Vercel:

```env
# SendGrid Configuration (Required)
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM_EMAIL=no-reply@dukanest.com  # Or noreply@dukanest.com (match your SendGrid verification)
SENDGRID_FROM_NAME=DukaNest

# Support Email (Optional - for platform emails)
SUPPORT_EMAIL=support@dukanest.com  # Your Namecheap Private Email
```

**Note:** The `SUPPORT_EMAIL` variable is optional. The system will use tenant contact emails for tenant-specific emails automatically. You can use `SUPPORT_EMAIL` for platform-level emails if needed.

---

## Configuring support@dukanest.com for Platform Emails

Since you have Namecheap Private Email set up for `support@dukanest.com`, you can use it as the reply-to address for platform-level emails.

### Option 1: Use Environment Variable (Recommended)

Add `SUPPORT_EMAIL` to Vercel environment variables:
- **Name:** `SUPPORT_EMAIL`
- **Value:** `support@dukanest.com`
- This can be used in platform emails as reply-to

### Option 2: Use in Code Directly

When sending platform emails, you can specify `support@dukanest.com` as the reply-to:

```typescript
import { sendPlatformEmail } from '@/lib/email/service';

await sendPlatformEmail({
  to: 'user@example.com',
  subject: 'Platform Notification',
  html: '<p>...</p>',
  replyTo: 'support@dukanest.com', // Your Namecheap Private Email
});
```

### How It Works

1. **Email is sent FROM:** `no-reply@dukanest.com` (SendGrid verified address)
2. **Reply-To is set to:** `support@dukanest.com` (your Namecheap Private Email)
3. **When customers reply:** Emails go to your Namecheap inbox at `support@dukanest.com`
4. **You receive replies:** In your Namecheap Private Email webmail or email client

### Tenant-Specific Emails

For tenant-specific emails (order confirmations, etc.):
- The system automatically uses the tenant's `contact_email` field as reply-to
- Each tenant can set their own support email in their dashboard settings
- If tenant doesn't set one, it defaults to `support@[subdomain].dukanest.com`

---

## Next Steps

1. ✅ Verify SendGrid API key is available
2. ✅ Add environment variables to Vercel (if not already added)
3. ✅ Add `SUPPORT_EMAIL` variable (optional, for platform emails)
4. ✅ Redeploy your application
5. ✅ Test email sending by creating a tenant
6. ✅ Test reply functionality - send a test email and reply to it
7. ✅ Verify replies arrive in your Namecheap Private Email inbox
8. ✅ Monitor SendGrid Activity logs

---

## Resources

- [SendGrid Domain Authentication Guide](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication)
- [SendGrid API Keys Documentation](https://docs.sendgrid.com/ui/account-and-settings/api-keys)
- [Vercel Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)
- [SendGrid Activity Dashboard](https://app.sendgrid.com/activity)

---

**Need Help?** Check the main [EMAIL_SETUP_GUIDE.md](./EMAIL_SETUP_GUIDE.md) for more detailed information.

