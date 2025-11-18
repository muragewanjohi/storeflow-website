# Adding SendGrid DNS Records to Vercel DNS

**Last Updated:** 2024

---

## Overview

If you're using **Vercel nameservers** (instead of Namecheap DNS), you need to add SendGrid's DNS records in Vercel's DNS system instead of Namecheap. This guide shows you exactly how to do that.

---

## Prerequisites

- ✅ Domain `dukanest.com` added to Vercel
- ✅ Vercel nameservers configured at Namecheap
- ✅ SendGrid domain authentication records ready (from SendGrid dashboard)

---

## Step 1: Get SendGrid DNS Records

### 1.1 Go to SendGrid Dashboard

1. Login to SendGrid: https://app.sendgrid.com
2. Navigate to: **Settings** → **Sender Authentication** → **Domain Authentication**
3. Click on your domain: `dukanest.com`

### 1.2 View DNS Records

SendGrid will show you the DNS records you need to add. You should see something like:

**CNAME Records:**
```
Type: CNAME
Host: em7645.dukanest.com
Value: u57371443.wl194.sendgrid.net.

Type: CNAME
Host: s1._domainkey.dukanest.com
Value: s1.domainkey.u57371443.wl194.sendgrid.net.

Type: CNAME
Host: s2._domainkey.dukanest.com
Value: s2.domainkey.u57371443.wl194.sendgrid.net.
```

**TXT Record:**
```
Type: TXT
Host: _dmarc.dukanest.com
Value: v=DMARC1; p=none;
```

**📝 Note:** Your actual records will be different. Copy the exact values from SendGrid!

---

## Step 2: Add Records to Vercel DNS

### 2.1 Access Vercel DNS Management

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Click on your StoreFlow project

2. **Navigate to Domain DNS Settings**
   - Click **Settings** tab
   - Click **Domains** in the sidebar
   - Click on `dukanest.com` domain
   - Click **"DNS Records"** tab (or **"DNS"** section)

### 2.2 Add CNAME Records

For each CNAME record from SendGrid:

1. **Click "Add Record"** or **"Add DNS Record"**
2. **Select Record Type:** `CNAME`
3. **Enter Host/Name:**
   - For `em7645.dukanest.com`, enter: `em7645`
   - For `s1._domainkey.dukanest.com`, enter: `s1._domainkey`
   - For `s2._domainkey.dukanest.com`, enter: `s2._domainkey`
   
   **Note:** Vercel automatically adds `.dukanest.com`, so only enter the subdomain part!

4. **Enter Value/Target:**
   - Copy the exact value from SendGrid (e.g., `u57371443.wl194.sendgrid.net.`)
   - Include the trailing dot (`.`) if SendGrid shows it
   - Or omit it - both usually work

5. **TTL:** Leave as default (usually 3600 or Automatic)

6. **Click "Save"** or **"Add Record"**

**Repeat for all 3 CNAME records:**
- ✅ `em7645` → `u57371443.wl194.sendgrid.net.`
- ✅ `s1._domainkey` → `s1.domainkey.u57371443.wl194.sendgrid.net.`
- ✅ `s2._domainkey` → `s2.domainkey.u57371443.wl194.sendgrid.net.`

### 2.3 Add TXT Record (DMARC)

1. **Click "Add Record"**
2. **Select Record Type:** `TXT`
3. **Enter Host/Name:** `_dmarc`
   - Vercel will automatically add `.dukanest.com`
4. **Enter Value:**
   - Copy from SendGrid: `v=DMARC1; p=none;`
   - Include the semicolon and space
5. **TTL:** Leave as default
6. **Click "Save"**

---

## Step 3: Verify Records in Vercel

After adding all records, verify they're correct:

1. **Check Vercel DNS Records List**
   - Should see all 4 records listed:
     - 3 CNAME records
     - 1 TXT record

2. **Verify Values Match**
   - Compare each record with SendGrid's requirements
   - Make sure there are no typos

---

## Step 4: Wait for DNS Propagation

1. **Wait 15-30 minutes** for DNS records to propagate
2. **Check DNS Resolution:**
   ```bash
   # Test CNAME records
   nslookup em7645.dukanest.com
   nslookup s1._domainkey.dukanest.com
   nslookup s2._domainkey.dukanest.com
   
   # Test TXT record
   nslookup -type=TXT _dmarc.dukanest.com
   ```

3. **Or use online tool:**
   - https://www.whatsmydns.net/#CNAME/em7645.dukanest.com
   - Check if records resolve correctly

---

## Step 5: Verify in SendGrid

1. **Go back to SendGrid Dashboard**
   - Settings → Sender Authentication → Domain Authentication
   - Click on `dukanest.com`

2. **Click "Verify" or "Re-verify"**
   - SendGrid will check if DNS records are correct
   - Wait for validation to complete

3. **Check Status:**
   - ✅ **"Verified"** = Success!
   - ⚠️ **"Pending"** = Still propagating (wait longer)
   - ❌ **"Invalid"** = Check records again

---

## Complete Record Example

Here's what your Vercel DNS records should look like:

| Type | Host/Name | Value/Target | TTL |
|------|-----------|--------------|-----|
| CNAME | `em7645` | `u57371443.wl194.sendgrid.net.` | 3600 |
| CNAME | `s1._domainkey` | `s1.domainkey.u57371443.wl194.sendgrid.net.` | 3600 |
| CNAME | `s2._domainkey` | `s2.domainkey.u57371443.wl194.sendgrid.net.` | 3600 |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | 3600 |

**Note:** Your actual values will be different! Use the values from your SendGrid dashboard.

---

## Troubleshooting

### Issue: Records Not Showing in Vercel

**Solutions:**
1. **Refresh the page** - Records may take a moment to appear
2. **Check you're in the right section** - Make sure you're in DNS Records, not Domain Settings
3. **Verify domain is using Vercel nameservers** - Check Namecheap to confirm

### Issue: SendGrid Still Shows "Invalid"

**Solutions:**
1. **Wait longer** - DNS propagation can take up to 48 hours
2. **Double-check values** - Compare character-by-character with SendGrid
3. **Check trailing dots** - Some DNS systems require them, some don't
4. **Verify record types** - Make sure CNAME is CNAME, TXT is TXT
5. **Test DNS resolution** - Use `nslookup` or online tools to verify records are live

### Issue: Can't Add Records in Vercel

**Solutions:**
1. **Check permissions** - Make sure you're project owner/admin
2. **Verify domain ownership** - Domain must be fully verified in Vercel first
3. **Try different browser** - Sometimes UI issues are browser-specific
4. **Use Vercel API** - If UI doesn't work, use API to add records (see below)

---

## Alternative: Using Vercel API

If the Vercel dashboard UI doesn't work, you can add DNS records via API:

```typescript
// Example: Add DNS record via Vercel API
const response = await fetch(
  `https://api.vercel.com/v2/domains/${domain}/records`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'CNAME',
      name: 'em7645',
      value: 'u57371443.wl194.sendgrid.net.',
      ttl: 3600,
    }),
  }
);
```

**Note:** Vercel's DNS API may have different endpoints. Check [Vercel API Documentation](https://vercel.com/docs/rest-api) for current endpoints.

---

## Important Notes

### ⚠️ Trailing Dots

- **CNAME values:** Some DNS systems require trailing dots (`.`), some don't
- **Try both:** If one doesn't work, try the other
- **Vercel usually:** Accepts both with and without trailing dots

### ⚠️ Host/Name Format

- **Vercel automatically adds domain:** Enter only the subdomain part
- **Example:** For `em7645.dukanest.com`, enter just `em7645`
- **Not:** `em7645.dukanest.com` (Vercel will add `.dukanest.com` automatically)

### ⚠️ Record Order

- **Order doesn't matter** - Add records in any order
- **All must be present** - SendGrid needs all 4 records to verify

---

## Verification Checklist

After adding records:

- [ ] All 3 CNAME records added in Vercel DNS
- [ ] 1 TXT record (DMARC) added in Vercel DNS
- [ ] Values match exactly with SendGrid requirements
- [ ] Waited 15-30 minutes for DNS propagation
- [ ] Tested DNS resolution (nslookup or online tool)
- [ ] Verified in SendGrid dashboard
- [ ] SendGrid shows "Verified" status

---

## Quick Reference

**Vercel DNS Location:**
- Dashboard → Project → Settings → Domains → `dukanest.com` → DNS Records

**SendGrid DNS Requirements:**
- Settings → Sender Authentication → Domain Authentication → `dukanest.com`

**Test DNS Resolution:**
- https://www.whatsmydns.net/
- Or use `nslookup` command

---

## Next Steps

After SendGrid DNS records are verified:

1. ✅ **Test email sending** - Send a test email from your app
2. ✅ **Check email deliverability** - Verify emails aren't going to spam
3. ✅ **Monitor SendGrid dashboard** - Check email activity and delivery rates

---

**Last Updated:** 2024  
**Status:** Complete Guide

