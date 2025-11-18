# Vercel Domain Setup Guide - Day 13.5

**Last Updated:** 2024  
**Status:** In Progress

---

## Overview

This guide walks you through linking `dukanest.com` to your Vercel project and setting up wildcard subdomain support for multi-tenant functionality.

---

## Prerequisites

- ✅ Domain `dukanest.com` purchased from Namecheap
- ✅ Vercel account created
- ✅ Vercel project created (StoreFlow)
- ✅ Vercel API token generated

---

## Step 1: Get Vercel Credentials

### 1.1 Get Vercel API Token

1. Go to https://vercel.com/account/tokens
2. Click **"Create Token"**
3. Name it: `StoreFlow Production`
4. Set expiration: **No Expiration** (or custom)
5. Copy the token (starts with `vercel_` or similar)
6. Save it securely (you'll only see it once!)

### 1.2 Get Vercel Project ID

**Option A: Via Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Click on your StoreFlow project
3. Go to **Settings** → **General**
4. Copy the **Project ID** (looks like `prj_xxxxxxxxxxxxx`)

**Option B: Via Vercel CLI**
```bash
cd storeflow
npx vercel link
# This will show your project ID
```

### 1.3 Add to Environment Variables

Add to `.env.local`:
```env
# Vercel Configuration
VERCEL_TOKEN=vercel_your-token-here
VERCEL_PROJECT_ID=prj_your-project-id-here
```

---

## Step 2: Add Base Domain to Vercel

### Option A: Via Vercel Dashboard (Recommended for First Time)

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Click on your StoreFlow project

2. **Navigate to Settings → Domains**
   - Click **Settings** tab
   - Click **Domains** in the sidebar

3. **Add Domain**
   - Click **"Add Domain"** button
   - Enter: `dukanest.com`
   - Click **"Add"**

4. **Vercel will show DNS configuration**
   - You'll see instructions for DNS setup
   - Note the nameservers or CNAME records shown

### Option B: Via API (For Automation)

We already have the code! You can test it:

```typescript
// Test script (create: scripts/test-vercel-domain.ts)
import { addTenantDomain } from '@/lib/vercel-domains';

const projectId = process.env.VERCEL_PROJECT_ID!;
await addTenantDomain('dukanest.com', projectId);
```

---

## Step 3: Configure DNS at Namecheap

Vercel gives you **two options** for DNS configuration:

### Option A: Use Vercel Nameservers (Recommended)

**Best for:** Full control, automatic SSL, easier management

**Steps:**
1. **Get Vercel Nameservers**
   - In Vercel Dashboard → Settings → Domains → `dukanest.com`
   - You'll see nameservers like:
     ```
     ns1.vercel-dns.com
     ns2.vercel-dns.com
     ```

2. **Update Nameservers at Namecheap**
   - Go to Namecheap → Domain List → `dukanest.com` → Manage
   - Go to **"Nameservers"** section
   - Select **"Custom DNS"**
   - Enter Vercel nameservers:
     ```
     ns1.vercel-dns.com
     ns2.vercel-dns.com
     ```
   - Click **"Save"**

3. **Wait for DNS Propagation**
   - Usually 5-30 minutes
   - Can take up to 48 hours
   - Check status: https://www.whatsmydns.net/#NS/dukanest.com

**⚠️ Important:** If you use Vercel nameservers, you'll need to:
- **Re-add SendGrid DNS records** in Vercel DNS (not Namecheap)
- See detailed guide: [`VERCEL_SENDGRID_DNS_SETUP.md`](./VERCEL_SENDGRID_DNS_SETUP.md)
- Or use Namecheap's DNS forwarding for email

### Option B: Use CNAME Records (Keep Namecheap DNS)

**Best for:** Keeping Namecheap DNS control, easier email management

**Steps:**
1. **Get CNAME Target from Vercel**
   - In Vercel Dashboard → Settings → Domains → `dukanest.com`
   - Look for **"CNAME Configuration"**
   - You'll see a target like: `cname.vercel-dns.com` or `76.76.21.21`

2. **Add CNAME Record at Namecheap**
   - Go to Namecheap → Domain List → `dukanest.com` → Advanced DNS
   - Click **"Add New Record"**
   - Type: **CNAME Record**
   - Host: `@` (for apex domain) or `www` (for www)
   - Value: `cname.vercel-dns.com` (or the target Vercel provides)
   - TTL: Automatic
   - Click **"Save"**

3. **For Apex Domain (dukanest.com)**
   - Some DNS providers don't support CNAME for apex
   - Vercel may provide **A records** instead:
     ```
     Type: A Record
     Host: @
     Value: 76.76.21.21 (or IP Vercel provides)
     ```

4. **For www Subdomain**
   - Add CNAME:
     ```
     Type: CNAME Record
     Host: www
     Value: cname.vercel-dns.com
     ```

**✅ Advantage:** You keep Namecheap DNS, so SendGrid records stay in Namecheap!

---

## Step 4: Set Up Wildcard Subdomain Support

For multi-tenant functionality, we need to support `*.dukanest.com` subdomains.

### Option A: Using Vercel Nameservers

**Wildcard is automatic!** Vercel handles `*.dukanest.com` automatically when you use their nameservers.

### Option B: Using CNAME Records (Namecheap DNS)

**Add Wildcard CNAME:**
1. Go to Namecheap → Advanced DNS
2. Add CNAME Record:
   ```
   Type: CNAME Record
   Host: *
   Value: cname.vercel-dns.com (same as apex)
   TTL: Automatic
   ```
3. Click **"Save"**

**Note:** Some DNS providers don't support wildcard CNAME. In that case:
- Use Vercel nameservers (Option A)
- Or add subdomains individually as needed

---

## Step 5: Verify Domain in Vercel

### 5.1 Check Domain Status

1. Go to Vercel Dashboard → Settings → Domains
2. Click on `dukanest.com`
3. Check status:
   - ✅ **"Valid Configuration"** = Good!
   - ⚠️ **"Pending"** = DNS still propagating (wait 15-30 min)
   - ❌ **"Invalid Configuration"** = Check DNS records

### 5.2 Verify SSL Certificate

Vercel automatically issues SSL certificates:
- Usually takes 5-15 minutes after DNS propagation
- Check status in Vercel Dashboard → Domains
- Look for **"SSL Certificate"** status

### 5.3 Test Domain Access

After DNS propagates (15-30 minutes):
1. Visit: `https://dukanest.com`
2. Visit: `https://www.dukanest.com`
3. Both should show your Vercel deployment

### 5.4 Verify DNS Resolution

**Test Apex Domain:**
```bash
nslookup dukanest.com
# Should resolve to Vercel IP or CNAME
```

**Test www Subdomain:**
```bash
nslookup www.dukanest.com
# Should resolve to Vercel IP or CNAME
```

**Or use online tool:**
- https://www.whatsmydns.net/#A/dukanest.com
- Should show Vercel IP addresses or CNAME target

### 5.5 Verify Environment Variables

Check your `.env.local` has:
```env
# Vercel Configuration
VERCEL_TOKEN=vercel_your-token-here
VERCEL_PROJECT_ID=prj_your-project-id-here

# Domain Configuration
NEXT_PUBLIC_APP_URL=https://dukanest.com
```

---

## Step 6: Test Subdomain Routing

### 6.1 Create Test Tenant

1. Go to your admin dashboard: `/admin/tenants/new`
2. Create a test tenant with subdomain: `teststore`
3. This should create: `teststore.dukanest.com`

### 6.2 Verify Subdomain Works

1. Wait 5-10 minutes for DNS propagation
2. Visit: `https://teststore.dukanest.com`
3. Should show your Next.js app
4. Middleware should route to correct tenant

### 6.3 Check SSL Certificate

- Vercel automatically issues SSL for subdomains
- Check in Vercel Dashboard → Domains
- Should see `teststore.dukanest.com` listed

---

## Step 7: Update Tenant Creation API

Once base domain is working, we'll update tenant creation to automatically add subdomains to Vercel.

**File to update:** `storeflow/src/app/api/admin/tenants/route.ts`

**Current status:** Has TODO comment for Vercel integration

**Next step:** Uncomment and implement automatic subdomain creation

---

## Troubleshooting

### Issue: Domain shows "Invalid Configuration"

**Solutions:**
1. **Check DNS records** - Make sure they match Vercel's requirements exactly
2. **Wait longer** - DNS propagation can take up to 48 hours
3. **Check nameservers** - If using Vercel nameservers, verify they're set correctly
4. **Clear DNS cache** - Try accessing from different network/device

### Issue: SSL Certificate Not Issuing

**Solutions:**
1. **Wait 15-30 minutes** - SSL certificates take time to issue
2. **Check DNS propagation** - Domain must be fully propagated first
3. **Verify domain in Vercel** - Domain must show "Valid Configuration"
4. **Contact Vercel support** - If still not working after 1 hour

### Issue: Subdomains Not Working / 404 DEPLOYMENT_NOT_FOUND

**Symptoms:**
- Subdomain shows 404 "DEPLOYMENT_NOT_FOUND" error
- Subdomain DNS resolves but Vercel doesn't recognize it

**Cause:**
Even with wildcard DNS configured, Vercel needs each subdomain to be explicitly added to the project for SSL certificate issuance and deployment routing.

**Solutions:**

1. **Add Subdomain to Vercel (Quick Fix):**
   - **Via Dashboard:** Vercel Dashboard → Settings → Domains → Add Domain → Enter `subdomain.dukanest.com`
   - **Via Script:** `npx tsx scripts/add-subdomain-to-vercel.ts <subdomain>`
   - **Via API:** The tenant creation API now automatically adds subdomains

2. **For Existing Tenants:**
   ```bash
   # Add existing tenant subdomains
   npx tsx scripts/add-subdomain-to-vercel.ts myduka
   npx tsx scripts/add-subdomain-to-vercel.ts carwash
   ```

3. **Verify:**
   - Wait 5-15 minutes for SSL certificate
   - Check Vercel Dashboard → Domains
   - Test: `https://subdomain.dukanest.com`

4. **Check wildcard DNS** - Verify `*.dukanest.com` CNAME exists (if using Namecheap DNS)
5. **Use Vercel nameservers** - Wildcard works automatically with Vercel DNS
6. **Check middleware** - Verify tenant resolution is working
7. **Test DNS resolution:**
   ```bash
   nslookup teststore.dukanest.com
   ```

### Issue: SendGrid DNS Records Lost

**If you switched to Vercel nameservers:**
- You need to add SendGrid DNS records in Vercel DNS
- **See detailed guide:** [`VERCEL_SENDGRID_DNS_SETUP.md`](./VERCEL_SENDGRID_DNS_SETUP.md)
- Quick steps:
  1. Go to Vercel Dashboard → Domains → `dukanest.com` → DNS Records
  2. Add CNAME records from SendGrid (3 records)
  3. Add TXT record for DMARC (1 record)
  4. Wait 15-30 minutes for propagation
  5. Verify in SendGrid dashboard

**If you kept Namecheap DNS:**
- SendGrid records should still work
- No changes needed

### Issue: Vercel API Authorization Errors

**Error:** "Not authorized: Trying to access resource under scope..."

**Problem:**
Your Vercel token doesn't have access to the project.

**Solutions:**
1. **Check Token Scope:**
   - Go to Vercel Dashboard → Settings → Tokens
   - Verify your token has the correct scope
   - For project-level access, token should have access to the specific project

2. **Create New Token with Correct Scope:**
   - Go to Vercel Dashboard → Settings → Tokens
   - Click **Create Token**
   - Select scope: **Full Account** (recommended) or **Specific Projects**
   - If selecting specific projects, ensure your project is included
   - Copy the token

3. **Update Environment Variable:**
   ```env
   VERCEL_TOKEN=your-new-token-here
   ```

4. **Verify Project ID:**
   - Check `VERCEL_PROJECT_ID` matches your project
   - Get from: Vercel Dashboard → Project → Settings → General

### Issue: Vercel API Rate Limits

**Error:** "Rate limit exceeded"

**Solutions:**
1. **Wait and Retry:**
   - Vercel API has rate limits
   - Wait 1-2 minutes and retry
   - The tenant creation API handles this gracefully (non-blocking)

2. **Check API Usage:**
   - Monitor Vercel Dashboard → Settings → Usage
   - Consider implementing retry logic for production

### Issue: Domain Already Exists

**Error:** "Domain already exists"

**This is normal!** The API handles this gracefully:
- If domain already exists, it returns the existing domain info
- No action needed - domain is already configured

---

## Recommended Setup

### For Development/MVP:
- ✅ Use **CNAME records** (keep Namecheap DNS)
- ✅ Easier to manage SendGrid records
- ✅ More control over DNS

### For Production:
- ✅ Use **Vercel nameservers** (full automation)
- ✅ Automatic wildcard support
- ✅ Better performance
- ⚠️ Need to manage SendGrid records in Vercel DNS

---

## Next Steps After Domain Setup

1. ✅ **Verify base domain works** (`dukanest.com` and `www.dukanest.com`)
2. ✅ **Test subdomain routing** (create test tenant)
3. ✅ **Update tenant creation API** to auto-add subdomains to Vercel
4. ✅ **Test automatic subdomain creation** when creating tenants
5. ✅ **Verify SSL certificates** for subdomains

---

## Checklist

### Domain Setup:
- [ ] Get Vercel API token
- [ ] Get Vercel project ID
- [ ] Add credentials to `.env.local`
- [ ] Add `dukanest.com` to Vercel project
- [ ] Choose DNS method (nameservers or CNAME)
- [ ] Configure DNS at Namecheap
- [ ] Wait for DNS propagation (15-30 min)
- [ ] Verify domain in Vercel dashboard
- [ ] Verify SSL certificate issued
- [ ] Test `https://dukanest.com` works
- [ ] Test `https://www.dukanest.com` works

### Wildcard Setup:
- [ ] Set up wildcard DNS (`*.dukanest.com`)
- [ ] Create test tenant with subdomain
- [ ] Test `https://teststore.dukanest.com` works
- [ ] Verify SSL certificate for subdomain
- [ ] Test tenant isolation (different subdomains = different tenants)

### Automation:
- [ ] Update tenant creation API to call Vercel
- [ ] Test automatic subdomain creation
- [ ] Test subdomain removal on tenant deletion
- [ ] Add error handling for Vercel API failures

---

## Resources

- [Vercel Domain Documentation](https://vercel.com/docs/concepts/projects/domains)
- [Vercel DNS Configuration](https://vercel.com/docs/concepts/projects/domains/dns-records)
- [Vercel API Documentation](https://vercel.com/docs/rest-api)
- [Namecheap DNS Management](https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-can-i-set-up-an-a-address-cname-alias-mx-mail-txt-spf-or-aaaa-ipv6-address-record-for-my-domain/)

---

**Last Updated:** 2024  
**Status:** Ready for Implementation

