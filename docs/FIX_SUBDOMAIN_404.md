# Fix: Subdomain 404 Error (DEPLOYMENT_NOT_FOUND)

**Issue:** `myduka.dukanest.com` shows 404 "DEPLOYMENT_NOT_FOUND"  
**Cause:** Subdomain not added to Vercel project  
**Solution:** Add subdomain to Vercel (manually or via API)

---

## Quick Fix: Add Existing Subdomain to Vercel

### Option 1: Via Vercel Dashboard (Easiest)

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Click on your StoreFlow project

2. **Navigate to Domains**
   - Settings → Domains
   - Click **"Add Domain"**

3. **Add Subdomain**
   - Enter: `myduka.dukanest.com`
   - Click **"Add"**

4. **Wait 5-15 minutes**
   - Vercel will issue SSL certificate automatically
   - Check status in Domains section

5. **Test**
   - Visit: `https://myduka.dukanest.com`
   - Should now work!

---

### Option 2: Via Script (Automated)

**Prerequisites:**
- `VERCEL_TOKEN` in `.env.local`
- `VERCEL_PROJECT_ID` in `.env.local`

**Run:**
```bash
cd storeflow
npx tsx scripts/add-subdomain-to-vercel.ts myduka
```

**Expected Output:**
```
Adding myduka.dukanest.com to Vercel project prj_xxxxx...
✅ Success!
Domain myduka.dukanest.com has been added to Vercel.
SSL certificate will be issued automatically (takes 5-15 minutes).
```

---

### Option 3: Via API (Using Existing Code)

You can also use the API directly:

```typescript
import { addTenantDomain } from '@/lib/vercel-domains';

const projectId = process.env.VERCEL_PROJECT_ID!;
await addTenantDomain('myduka.dukanest.com', projectId);
```

---

## ✅ Long-Term Fix: Automatic Subdomain Creation

**Good News:** I've already updated the tenant creation API! 

**File Updated:** `storeflow/src/app/api/admin/tenants/route.ts`

**What Changed:**
- Now automatically adds subdomain to Vercel when tenant is created
- Non-blocking (doesn't fail tenant creation if Vercel API fails)
- Logs errors for debugging

**For Future Tenants:**
- When you create a new tenant, the subdomain will be automatically added to Vercel
- No manual steps needed!

---

## Environment Variables Required

Make sure these are in `.env.local`:

```env
# Vercel Configuration
VERCEL_TOKEN=vercel_your-token-here
VERCEL_PROJECT_ID=prj_your-project-id-here
```

**To get these:**
1. **VERCEL_TOKEN:** https://vercel.com/account/tokens
2. **VERCEL_PROJECT_ID:** Vercel Dashboard → Project → Settings → General

---

## Verification Steps

After adding subdomain:

1. **Check Vercel Dashboard**
   - Settings → Domains
   - Should see `myduka.dukanest.com` listed
   - Status should show "Valid Configuration"

2. **Wait for SSL (5-15 minutes)**
   - SSL certificate will be issued automatically
   - Check SSL status in Vercel Dashboard

3. **Test Access**
   - Visit: `https://myduka.dukanest.com`
   - Should show your Next.js app
   - Middleware should route to correct tenant

---

## Why This Happens

**Vercel's Wildcard DNS Behavior:**
- Wildcard DNS (`*`) routes traffic to your project
- BUT Vercel still needs to know about each subdomain explicitly
- This is for:
  - SSL certificate issuance
  - Deployment routing
  - Domain verification

**Solution:**
- Add each subdomain to Vercel (now automated in tenant creation API)
- Or use Vercel's wildcard domain feature (if available)

---

## For Existing Tenants

If you have other tenants that aren't working:

1. **List all tenants:**
   ```sql
   SELECT subdomain FROM tenants WHERE status = 'active';
   ```

2. **Add each subdomain to Vercel:**
   - Via Dashboard (easiest)
   - Or use the script: `npx tsx scripts/add-subdomain-to-vercel.ts <subdomain>`

3. **Or add all at once:**
   ```bash
   # Example: Add multiple subdomains
   npx tsx scripts/add-subdomain-to-vercel.ts myduka
   npx tsx scripts/add-subdomain-to-vercel.ts carwash
   npx tsx scripts/add-subdomain-to-vercel.ts teststore
   ```

---

## Next Steps

1. ✅ **Add `myduka.dukanest.com` to Vercel** (via Dashboard or script)
2. ✅ **Wait 5-15 minutes** for SSL certificate
3. ✅ **Test access** at `https://myduka.dukanest.com`
4. ✅ **Future tenants** will be added automatically (API updated)

---

**Last Updated:** 2024

