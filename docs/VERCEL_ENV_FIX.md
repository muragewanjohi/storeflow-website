# Quick Fix: Environment Variables Not Working

**Your test endpoint shows variables are "NOT SET" even though you configured them. Here's the fix:**

---

## The Problem

Your test endpoint shows:
```json
{
  "DISABLE_MFA_TEMPORARILY": "NOT SET",
  "NODE_ENV": "production",
  "bypassWillWork": false
}
```

But you've set the variables in Vercel. Why?

---

## Root Cause

Based on the [Vercel documentation](https://vercel.com/docs/deployments/environments), Vercel has three default environments:

1. **Local Development** - For developing on your local machine (uses `vercel env pull`)
2. **Preview** - For branch deployments (non-production branches like `dev`) ✅ **This is what you need!**
3. **Production** - For production branch deployments (usually `main`)

**⚠️ CRITICAL MISUNDERSTANDING:**

The **"Development"** environment you see in Settings → Environments is **NOT used for Vercel deployments!**

According to Vercel docs:
> "Development: Standard environment — included with all Vercel projects — used to supply environment variables in local development"

**This means:**
- ❌ "Development" environment = Only for `vercel env pull` (local development)
- ✅ "Preview" environment = For all branch deployments (including your `dev` branch)
- ✅ "Production" environment = For production branch deployments

**Your Problem:**
You've set variables for "Development" environment, but your `dev` branch deployment uses "Preview" environment variables!

---

## Quick Fix Steps

### Step 1: Check If You Have a Custom Environment

According to [Vercel's documentation](https://vercel.com/docs/deployments/environments), custom environments can be created for specialized workflows.

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environments** (left sidebar)
2. Look for a custom environment named "development"
3. If you see "development" listed, you have a custom environment

**What "Preview development" means:**
- If you have a **custom environment** named "development", variables must be set for that custom environment
- The "Preview" prefix indicates it's a preview-type custom environment (not production)
- Variables set for "Preview" won't apply to custom environments

### Step 2: Determine Your Environment Type

**Based on [Vercel's documentation](https://vercel.com/docs/deployments/environments), check:**

1. Go to **Settings** → **Environments** (left sidebar, under "Environments" section)
2. Look for a custom environment named "development"
3. **If you see "development" listed:**
   - You have a custom environment ✅
   - Variables must be set for **"development"** (the custom environment name)
   - "Preview development" means Preview-type custom environment named "development"
4. **If you DON'T see "development" listed:**
   - You're using standard Preview environment
   - Variables must be set for **"Preview"**

### Step 3: Check Current Variables

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Search for `NODE_ENV`
3. Look at what environments it's set for

**What you might see:**
- ❌ "Development" only (standard environment, not used for deployments)
- ❌ "Preview" only (won't work if you have custom environment "development")
- ✅ "development" (custom environment) - **This is what you need if you have a custom environment!**
- ✅ "Preview" (standard environment) - **This is what you need if you DON'T have a custom environment!**

### Step 3: Update NODE_ENV for Preview Environment

**You need to add/update the variable for "Preview" environment:**

**Option A: Edit Existing Variable (Add Preview)**
1. Find `NODE_ENV` in the list
2. Click **"..."** → **"Edit"**
3. In environment checkboxes:
   - ✅ Check **"Preview"** (this is what you need!)
   - You can keep "Development" checked too (for local dev)
4. Value: `development`
5. Click **"Save"**

**Option B: Add New Variable for Preview**
1. Click **"Add Environment Variable"**
2. **Key:** `NODE_ENV`
3. **Value:** `development`
4. **Environment:** Check **"Preview"** (this is critical!)
5. Click **"Save"**

### Step 4: Update DISABLE_MFA_TEMPORARILY for Preview Environment

**You need to add/update the variable for "Preview" environment:**

**Option A: Edit Existing Variable (Add Preview)**
1. Find `DISABLE_MFA_TEMPORARILY` in the list
2. Click **"..."** → **"Edit"**
3. In environment checkboxes:
   - ✅ Check **"Preview"** (this is what you need!)
   - You can keep "Development" checked too (for local dev)
4. Value: `true`
5. Click **"Save"**

**Option B: Add New Variable for Preview**
1. Click **"Add Environment Variable"**
2. **Key:** `DISABLE_MFA_TEMPORARILY`
3. **Value:** `true`
4. **Environment:** Check **"Preview"** (this is critical!)
5. Click **"Save"**

### Step 5: Verify Variables Are Set Correctly

After updating, both variables should show **"Preview"** in the Environments column:

**What you should see:**
```
NODE_ENV
  └─ Preview: development ✓
  └─ Development: development (optional, for local dev)

DISABLE_MFA_TEMPORARILY
  └─ Preview: true ✓
  └─ Development: true (optional, for local dev)
```

**Key Point:** 
- ✅ **"Preview"** must be checked (for deployments)
- ✅ "Development" can also be checked (for local dev with `vercel env pull`)
- ❌ "Development" alone is NOT enough for deployments!

### Step 6: Redeploy (CRITICAL!)

⚠️ **Environment variables only apply to NEW deployments!**

1. Go to **Deployments** tab
2. Find your latest `dev` branch deployment
3. Click **"..."** → **"Redeploy"**
4. Wait for deployment to complete (2-3 minutes)

### Step 7: Test Again

1. Visit: `https://dev.dukanest.com/api/test-env`
2. You should now see:
   ```json
   {
     "DISABLE_MFA_TEMPORARILY": "true",
     "NODE_ENV": "development",
     "bypassWillWork": true,
     "message": "✅ Bypass should work!"
   }
   ```

---

## Common Mistakes

### ❌ Mistake 1: Using "Development" Environment for Deployments
- **"Development" environment is ONLY for local development** (`vercel env pull`)
- **It is NOT used for Vercel deployments!**
- Your `dev` branch deployment uses **"Preview"** environment variables
- **Fix:** Set variables for **"Preview"** environment (not just "Development")

### ❌ Mistake 2: Not Redeploying
- Setting variables but not redeploying
- **Fix:** Always redeploy after setting variables

### ❌ Mistake 3: Wrong Value Format
- Using quotes: `"development"` instead of `development`
- Using uppercase: `Development` instead of `development`
- **Fix:** Use exact lowercase values, no quotes

### ❌ Mistake 4: Setting for Production Only
- Variables set for "Production" don't apply to Preview deployments
- **Fix:** Set for "Preview" environment

---

## Visual Guide

**What you should see in Vercel:**

```
Environment Variables List:

NODE_ENV
  └─ Preview: development ✓ (REQUIRED for deployments)
  └─ Development: development (optional, for local dev only)
  └─ Production: production (optional)

DISABLE_MFA_TEMPORARILY  
  └─ Preview: true ✓ (REQUIRED for deployments)
  └─ Development: true (optional, for local dev only)
  └─ Production: false (optional)
```

**Key Points:**
- ✅ **"Preview"** must be checked (your `dev` branch uses this!)
- ✅ "Development" is optional (only for `vercel env pull` locally)
- ❌ "Development" alone will NOT work for deployments

---

## Still Not Working?

If after following these steps the test endpoint still shows wrong values:

1. **Double-check environment scope:**
   - Variables MUST show "Preview" in the list
   - Not just "Development" or "Preview development"

2. **Verify you redeployed:**
   - Check deployment timestamp
   - Should be AFTER you set the variables

3. **Check deployment is from dev branch:**
   - Go to Deployments
   - Make sure you're looking at a `dev` branch deployment
   - Preview deployments use Preview environment variables

4. **Try clearing cache:**
   - Visit: `https://dev.dukanest.com/api/test-env?t=123456`
   - Add random query param to bypass cache

---

## Summary

**The Issue:**
- Variables are set for **"Development"** environment only
- "Development" environment is ONLY for local development (`vercel env pull`)
- **"Development" is NOT used for Vercel deployments!**
- Your `dev` branch deployment uses **"Preview"** environment variables

**The Fix:**
1. Edit both variables (`NODE_ENV` and `DISABLE_MFA_TEMPORARILY`)
2. Add **"Preview"** environment to each variable (keep "Development" if you want, but "Preview" is required)
3. Redeploy your `dev` branch
4. Test endpoint should show correct values

**Time to Fix:** 2-3 minutes

**Reference:** [Vercel Environments Documentation](https://vercel.com/docs/deployments/environments)

**Key Takeaway:** 
- "Development" = Local development only (not deployments)
- "Preview" = Branch deployments (your `dev` branch uses this!)
- "Production" = Production branch deployments

---

**Related:**
- [Vercel Environment Variables Setup](./VERCEL_ENV_VAR_SETUP.md)
- [Temporary 2FA Bypass Guide](./TEMPORARY_2FA_BYPASS.md)
