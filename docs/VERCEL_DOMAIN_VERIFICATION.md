# Vercel Domain Configuration Verification Checklist

**Last Updated:** 2024

---

## Quick Verification Steps

After adding domain configuration to Vercel, follow these steps to verify everything is working:

---

## ✅ Step 1: Verify Domain in Vercel Dashboard

### 1.1 Check Domain Status

1. Go to: https://vercel.com/dashboard
2. Click on your **StoreFlow** project
3. Navigate to: **Settings** → **Domains**
4. Click on `dukanest.com`

**Check Status:**
- ✅ **"Valid Configuration"** = DNS is correct, waiting for propagation
- ✅ **"Verified"** = Domain is fully configured and working
- ⚠️ **"Pending"** = DNS still propagating (wait 15-30 minutes)
- ❌ **"Invalid Configuration"** = Check DNS records

### 1.2 Check SSL Certificate

- Look for **"SSL Certificate"** section
- Status should show:
  - ✅ **"Valid"** or **"Issued"** = SSL is ready
  - ⚠️ **"Pending"** = Still being issued (wait 5-15 minutes)
  - ❌ **"Invalid"** = DNS not propagated yet

---

## ✅ Step 2: Verify DNS Configuration

### 2.1 Check What Method You Used

**Did you use:**
- [ ] **Vercel Nameservers** → Check nameservers at Namecheap
- [ ] **CNAME Records** → Check CNAME records at Namecheap

### 2.2 Test DNS Resolution

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

---

## ✅ Step 3: Test Domain Access

### 3.1 Test Apex Domain

1. Wait **15-30 minutes** after DNS configuration
2. Visit: `https://dukanest.com`
3. Should show your Vercel deployment
4. Check for SSL certificate (lock icon in browser)

### 3.2 Test www Subdomain

1. Visit: `https://www.dukanest.com`
2. Should redirect to `dukanest.com` or show your app
3. Check for SSL certificate

---

## ✅ Step 4: Verify SendGrid DNS (If Using Vercel Nameservers)

If you're using **Vercel nameservers**, verify SendGrid records:

### 4.1 Check SendGrid Records in Vercel

1. Go to Vercel Dashboard → Domains → `dukanest.com` → **DNS Records**
2. Verify you have:
   - ✅ 3 CNAME records (em7645, s1._domainkey, s2._domainkey)
   - ✅ 1 TXT record (_dmarc)

### 4.2 Test SendGrid DNS Resolution

```bash
# Test CNAME records
nslookup em7645.dukanest.com
nslookup s1._domainkey.dukanest.com
nslookup s2._domainkey.dukanest.com

# Test TXT record
nslookup -type=TXT _dmarc.dukanest.com
```

### 4.3 Verify in SendGrid

1. Go to SendGrid Dashboard
2. Settings → Sender Authentication → Domain Authentication
3. Click on `dukanest.com`
4. Click **"Verify"** or **"Re-verify"**
5. Should show **"Verified"** status

---

## ✅ Step 5: Test Wildcard Subdomain (If Configured)

### 5.1 Check Wildcard DNS

**If using CNAME method:**
- Verify `*.dukanest.com` CNAME exists at Namecheap
- Or verify wildcard is working in Vercel DNS

**If using Vercel nameservers:**
- Wildcard should work automatically

### 5.2 Test Subdomain

1. Create a test tenant with subdomain: `teststore`
2. Wait 5-10 minutes
3. Visit: `https://teststore.dukanest.com`
4. Should show your Next.js app
5. Middleware should route to correct tenant

---

## ✅ Step 6: Verify Environment Variables

Check your `.env.local` has:

```env
# Vercel Configuration
VERCEL_TOKEN=vercel_your-token-here
VERCEL_PROJECT_ID=prj_your-project-id-here

# Domain Configuration
NEXT_PUBLIC_APP_URL=https://dukanest.com
# Or
VERCEL_URL=your-app.vercel.app
```

---

## Common Issues & Solutions

### Issue: Domain Shows "Pending" for Long Time

**Solutions:**
1. **Wait longer** - DNS propagation can take up to 48 hours
2. **Check DNS records** - Verify they match Vercel's requirements
3. **Clear DNS cache** - Try from different network/device
4. **Check nameservers** - If using Vercel nameservers, verify at Namecheap

### Issue: SSL Certificate Not Issuing

**Solutions:**
1. **Wait 15-30 minutes** - SSL takes time after DNS propagation
2. **Verify DNS** - Domain must be fully propagated first
3. **Check domain status** - Must show "Valid Configuration" in Vercel
4. **Contact Vercel support** - If still not working after 1 hour

### Issue: Domain Not Accessible

**Solutions:**
1. **Check DNS propagation** - Use https://www.whatsmydns.net/
2. **Verify DNS records** - Make sure they're correct
3. **Check Vercel deployment** - Make sure project is deployed
4. **Try different browser/network** - May be DNS cache issue

---

## Next Steps After Verification

Once domain is verified and working:

1. ✅ **Test tenant creation** - Create a test tenant
2. ✅ **Update tenant creation API** - Add automatic subdomain creation
3. ✅ **Test subdomain routing** - Verify middleware works
4. ✅ **Test SSL for subdomains** - Verify automatic SSL issuance

---

## Verification Checklist

### Domain Setup:
- [ ] Domain added to Vercel project
- [ ] DNS configured (nameservers or CNAME)
- [ ] DNS propagated (checked with nslookup or online tool)
- [ ] Domain shows "Valid Configuration" in Vercel
- [ ] SSL certificate issued
- [ ] `https://dukanest.com` works
- [ ] `https://www.dukanest.com` works

### SendGrid (If Using Vercel Nameservers):
- [ ] SendGrid DNS records added to Vercel DNS
- [ ] DNS records propagated
- [ ] SendGrid shows "Verified" status

### Wildcard Subdomain:
- [ ] Wildcard DNS configured (`*.dukanest.com`)
- [ ] Test subdomain works (`teststore.dukanest.com`)
- [ ] SSL certificate issued for subdomain
- [ ] Tenant routing works correctly

---

## Quick Test Commands

```bash
# Test DNS resolution
nslookup dukanest.com
nslookup www.dukanest.com
nslookup teststore.dukanest.com

# Test SSL certificate
curl -I https://dukanest.com
curl -I https://www.dukanest.com

# Test SendGrid DNS (if using Vercel nameservers)
nslookup em7645.dukanest.com
nslookup -type=TXT _dmarc.dukanest.com
```

---

**Last Updated:** 2024

