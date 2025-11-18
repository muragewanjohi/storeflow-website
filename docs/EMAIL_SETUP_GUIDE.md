# Email Setup Guide for StoreFlow

**Last Updated:** 2024

---

## Overview

For a multi-tenant e-commerce platform, you need to set up email for:
1. **Sending transactional emails** (order confirmations, welcome emails, etc.) - **Required**
2. **Receiving emails** (support, admin inquiries) - **Optional**

**Good News:** You don't need to buy email hosting from Namecheap for sending emails! SendGrid handles all email sending.

---

## Part 1: Sending Emails (Required) ✅

### Option A: SendGrid Domain Authentication (Recommended - FREE)

**Important Note:** Twilio acquired SendGrid in 2019, but SendGrid still operates as a separate service. You use **SendGrid API Keys** (not Twilio Account SID/Auth Token) for email sending.

**What it is:** SendGrid allows you to send emails from your domain (`noreply@dukanest.com`) by verifying domain ownership through DNS records. **This is FREE** - you only pay for the emails you send.

**Steps:**

1. **Sign up for SendGrid** (if not already done)
   - Go to https://sendgrid.com (or https://app.sendgrid.com)
   - You can sign up with Twilio account (since Twilio owns SendGrid)
   - Create a free account (100 emails/day free forever)
   - Upgrade to Pro ($89.95/month for 100,000 emails) when needed
   
   **⚠️ Important:** Use **SendGrid API Keys**, NOT Twilio Account SID/Auth Token!
   - SendGrid API Keys: Format `SG.xxxxxxxxxxxxx` (for email sending)
   - Twilio Account SID/Auth Token: For SMS/Voice services only (NOT for email)

2. **Authenticate Your Domain in SendGrid**
   - Login to SendGrid Dashboard
   - Go to **Settings** → **Sender Authentication** → **Domain Authentication**
   - Click **Authenticate Your Domain**
   - Enter your domain: `dukanest.com`
   - SendGrid will generate DNS records you need to add

3. **Add DNS Records at Namecheap**
   - Go to Namecheap → Domain List → Manage → Advanced DNS
   - Add the DNS records SendGrid provides:
     - **CNAME records** (usually 3-4 records)
     - Example:
       ```
       CNAME: em1234.dukanest.com → u1234567.wl123.sendgrid.net
       CNAME: s1._domainkey.dukanest.com → s1.domainkey.u1234567.wl123.sendgrid.net
       CNAME: s2._domainkey.dukanest.com → s2.domainkey.u1234567.wl123.sendgrid.net
       ```
   - Wait for DNS propagation (usually 5-30 minutes, can take up to 48 hours)

4. **Verify Domain in SendGrid**
   - Go back to SendGrid Dashboard
   - Click **Verify** next to your domain
   - Once verified, you can send from any email address on that domain:
     - `noreply@dukanest.com`
     - `orders@dukanest.com`
     - `support@dukanest.com`
     - `admin@dukanest.com`
     - etc.

5. **Get SendGrid API Key** (NOT Twilio Account SID!)
   - Go to SendGrid Dashboard → **Settings** → **API Keys**
   - Click **Create API Key**
   - Name it: "StoreFlow Production"
   - Select **Full Access** (or customize permissions)
   - Copy the API key (starts with `SG.` - you'll only see it once!)
   
   **⚠️ Do NOT use:**
   - ❌ Twilio Account SID (starts with `AC...`)
   - ❌ Twilio Auth Token
   - ✅ **Use SendGrid API Key** (starts with `SG.`)

6. **Add to Environment Variables**
   ```env
   # SendGrid API Key (NOT Twilio credentials!)
   SENDGRID_API_KEY=SG.your-api-key-here
   SENDGRID_FROM_EMAIL=noreply@dukanest.com
   SENDGRID_FROM_NAME=StoreFlow
   ```
   
   **Note:** If you have a Twilio account, you can access SendGrid through it, but you still need to create a SendGrid API Key specifically for email sending.

**Cost:** 
- Free tier: 100 emails/day (forever)
- Pro plan: $89.95/month for 100,000 emails/month
- Perfect for 1,000 stores sending ~100,000 emails/month

---

## Part 2: Receiving Emails (Optional)

You only need this if you want to **receive** emails at addresses like:
- `support@dukanest.com`
- `admin@dukanest.com`
- `info@dukanest.com`

### Option 1: Namecheap Email Forwarding (Cheapest - $0-2/month)

**Best for:** Simple email forwarding to your personal email

**Steps:**
1. Go to Namecheap → Domain List → Manage → Email Forwarding
2. Create email forwarding rules:
   - `support@dukanest.com` → `your-personal-email@gmail.com`
   - `admin@dukanest.com` → `your-personal-email@gmail.com`
   - `info@dukanest.com` → `your-personal-email@gmail.com`

**Cost:** 
- Free for first 3 email forwards
- $1.88/year per additional email forward

**Limitations:**
- Can only forward, not send from these addresses
- No email storage
- No webmail access

---

### Option 2: Namecheap Private Email (Budget Option - $1.88/month)

**Best for:** Full email accounts with webmail access

**Steps:**
1. Go to Namecheap → Domain List → Manage → Private Email
2. Purchase Private Email ($1.88/month per mailbox)
3. Create mailboxes:
   - `support@dukanest.com`
   - `admin@dukanest.com`
   - etc.

**Features:**
- Full email account with webmail
- 5GB storage per mailbox
- Can send and receive
- Mobile app support

**Cost:** $1.88/month per mailbox

---

### Option 3: Google Workspace / Microsoft 365 (Professional Option)

**Best for:** Professional setup with multiple users

**Google Workspace:**
- $6/user/month (Business Starter)
- 30GB storage
- Professional email with Google apps

**Microsoft 365:**
- $6/user/month (Business Basic)
- 50GB storage
- Professional email with Office apps

**Best for:** If you have a team and need collaboration tools

---

### Option 4: Don't Set Up Receiving (Simplest)

**Best for:** MVP/Development phase

You can skip receiving emails entirely and:
- Use a contact form on your website
- Use support tickets (Day 21.5-22)
- Use your personal email for now

**Cost:** $0

---

## Recommended Setup for StoreFlow

### For MVP / Development:
1. ✅ **SendGrid Domain Authentication** (FREE) - For sending emails
2. ✅ **Namecheap Email Forwarding** (FREE for 3 addresses) - For receiving support/admin emails
3. ✅ **Skip full email hosting** - Save money until you need it

### For Production:
1. ✅ **SendGrid Pro Plan** ($89.95/month) - For sending 100,000+ emails/month
2. ✅ **Namecheap Email Forwarding** (FREE) - Forward `support@dukanest.com` to your email
3. ✅ **Support Ticket System** (Day 21.5-22) - Handle customer inquiries through the platform

---

## Email Addresses You'll Need

### Sending Addresses (via SendGrid - FREE):
- `noreply@dukanest.com` - Transactional emails (order confirmations, etc.)
- `orders@dukanest.com` - Order-related emails
- `support@dukanest.com` - Support emails (if you want to receive replies)

### Receiving Addresses (Optional):
- `support@dukanest.com` - Customer support (forward to your email)
- `admin@dukanest.com` - Admin inquiries (forward to your email)

**Note:** With SendGrid domain authentication, you can send from ANY email address on your domain without setting up individual mailboxes!

---

## Quick Setup Checklist

### Sending Emails (Required):
- [ ] Sign up for SendGrid account
- [ ] Authenticate `dukanest.com` domain in SendGrid
- [ ] Add DNS records at Namecheap
- [ ] Verify domain in SendGrid
- [ ] Create SendGrid API key
- [ ] Add API key to environment variables
- [ ] Test sending an email

### Receiving Emails (Optional):
- [ ] Decide if you need to receive emails
- [ ] Set up email forwarding at Namecheap (if needed)
- [ ] Or purchase Private Email / Google Workspace (if needed)

---

## Testing Email Setup

### Test SendGrid Domain Authentication:
```typescript
// Test in your code or SendGrid dashboard
import { sendEmail } from '@/lib/email/sendgrid';

await sendEmail({
  to: 'your-email@gmail.com',
  from: 'noreply@dukanest.com',
  subject: 'Test Email',
  html: '<p>This is a test email from StoreFlow!</p>',
});
```

### Check Email Deliverability:
- SendGrid Dashboard → Activity → Check email delivery
- Verify emails aren't going to spam
- Check SPF/DKIM records are properly configured

---

## Troubleshooting

### "Domain not verified" error:
- Check DNS records are added correctly at Namecheap
- Wait for DNS propagation (can take up to 48 hours)
- Verify records match exactly what SendGrid provided

### "Email not sending":
- Check SendGrid API key is correct
- Verify domain is authenticated
- Check SendGrid account limits (free tier: 100/day)
- Check email isn't being blocked by recipient's spam filter

### "Emails going to spam":
- Ensure domain authentication is complete
- Set up SPF and DKIM records (SendGrid provides these)
- Use a reputable email service (SendGrid is good)
- Avoid spam trigger words in subject lines

---

## Cost Summary

### Minimum Setup (MVP):
- **Sending:** SendGrid Free Tier (100 emails/day) = **$0/month**
- **Receiving:** Namecheap Email Forwarding (3 free) = **$0/month**
- **Total:** **$0/month** ✅

### Production Setup (1,000 stores):
- **Sending:** SendGrid Pro ($89.95/month for 100,000 emails) = **$89.95/month**
- **Receiving:** Namecheap Email Forwarding (free) = **$0/month**
- **Total:** **$89.95/month** ✅

---

## Next Steps

1. **Set up SendGrid domain authentication** (required for sending)
2. **Configure environment variables** in your `.env.local`
3. **Test email sending** with the welcome email function
4. **Set up email forwarding** (optional, for receiving)
5. **Monitor email delivery** in SendGrid dashboard

---

## Resources

- [SendGrid Domain Authentication Guide](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication)
- [SendGrid DNS Records Guide](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication#dns-records)
- [Namecheap Email Forwarding](https://www.namecheap.com/support/knowledgebase/article.aspx/322/2237/how-to-set-up-email-forwarding/)
- [SendGrid Pricing](https://sendgrid.com/pricing/)

---

**Bottom Line:** You don't need to buy email hosting from Namecheap! Just authenticate your domain with SendGrid (free) and optionally set up email forwarding (also free for 3 addresses).

