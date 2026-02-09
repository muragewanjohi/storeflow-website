# Setting Environment Variables in Vercel for Preview Deployments

**Step-by-step guide to fix environment variables for dev branch preview deployments**

---

## The Problem

Your test endpoint shows:
- `DISABLE_MFA_TEMPORARILY`: `"NOT SET"`
- `NODE_ENV`: `"production"` (should be `"development"`)

This means the environment variables are either:
1. Not set for Preview environment
2. Set incorrectly
3. Need a redeploy after setting

---

## Step-by-Step Fix

### Step 1: Go to Environment Variables

1. **Vercel Dashboard** → Your Project (`dukanest-website`)
2. Click **"Settings"** (in the top navigation)
3. Click **"Environment Variables"** (in the left sidebar)

### Step 2: Check Existing Variables

**IMPORTANT:** You might already have these variables set for "Development" or "Preview development", but you need them for **"Preview"** (without "development" suffix).

**What to look for:**
- ❌ "Development" environment - This is NOT used for branch deployments
- ❌ "Preview development" - This might work, but "Preview" is clearer
- ✅ "Preview" environment - This is what you need!

### Step 3: Add/Update NODE_ENV for Preview

**If variable exists for "Development" or "Preview development":**
1. Click the "..." menu on the existing `NODE_ENV` variable
2. Click "Edit"
3. Make sure **"Preview"** is checked in the environment list
4. If "Development" is checked, uncheck it (or keep both if you want)
5. Click "Save"

**If variable doesn't exist for Preview:**
1. **Click "Add Environment Variable"** button
2. **Key:** `NODE_ENV`
3. **Value:** `development` (exactly, lowercase, no quotes)
4. **Environment:** Select **"Preview"** (this is critical!)
   - ⚠️ Do NOT select "Production" or "Development"
   - ⚠️ Select "Preview" - this applies to all branch deployments
5. **Click "Save"**

### Step 4: Add/Update DISABLE_MFA_TEMPORARILY for Preview

**If variable exists for "Development" or "Preview development":**
1. Click the "..." menu on the existing `DISABLE_MFA_TEMPORARILY` variable
2. Click "Edit"
3. Make sure **"Preview"** is checked in the environment list
4. If "Development" is checked, uncheck it (or keep both if you want)
5. Click "Save"

**If variable doesn't exist for Preview:**
1. **Click "Add Environment Variable"** button again
2. **Key:** `DISABLE_MFA_TEMPORARILY`
3. **Value:** `true` (exactly, lowercase, no quotes)
4. **Environment:** Select **"Preview"** (this is critical!)
5. **Click "Save"**

### Step 5: Verify Variables Are Set

After adding/updating both variables, you should see in the list:

**Option A: Separate entries (Recommended)**
| Key | Value | Environments |
|-----|-------|--------------|
| `NODE_ENV` | `development` | Preview ✓ |
| `DISABLE_MFA_TEMPORARILY` | `true` | Preview ✓ |

**Option B: Combined entries (Also works)**
| Key | Value | Environments |
|-----|-------|--------------|
| `NODE_ENV` | `development` | Preview ✓, Development ✓ |
| `DISABLE_MFA_TEMPORARILY` | `true` | Preview ✓, Development ✓ |

**Important:** 
- Both variables MUST have "Preview" checked
- "Development" environment is optional (not used for branch deployments)
- "Preview" is what applies to your `dev` branch deployments

### Step 6: Redeploy (REQUIRED!)

⚠️ **Environment variables only apply to NEW deployments!**

**Option A: Redeploy from Dashboard**
1. Go to **Deployments** tab
2. Find your latest `dev` branch deployment
3. Click the **"..."** menu (three dots)
4. Click **"Redeploy"**
5. Wait for deployment to complete

**Option B: Push Empty Commit**
```bash
git commit --allow-empty -m "Trigger redeploy for env vars"
git push origin dev
```

### Step 7: Verify It Works

1. **Wait for deployment to complete** (2-3 minutes)
2. **Visit test endpoint:** `https://dev.dukanest.com/api/test-env`
3. **You should now see:**
   ```json
   {
     "DISABLE_MFA_TEMPORARILY": "true",
     "NODE_ENV": "development",
     "bypassWillWork": true,
     "message": "✅ Bypass should work! Environment variables are set correctly."
   }
   ```

---

## Common Mistakes

### ❌ Wrong: Setting for "Production" Only
- Variables set for "Production" don't apply to Preview deployments
- Preview deployments need "Preview" environment variables

### ❌ Wrong: Setting for "Development" Environment Only
- "Development" is a separate environment type
- For branch deployments, you need "Preview" environment
- "Development" environment is NOT used for Vercel deployments
- You can have both checked, but "Preview" is required

### ❌ Wrong: Not Redeploying
- Environment variables only apply to NEW deployments
- You MUST redeploy after setting variables

### ❌ Wrong: Using Quotes in Values
- Value should be: `development` (not `"development"`)
- Value should be: `true` (not `"true"`)

### ✅ Correct: Preview Environment
- Select "Preview" for branch deployments
- This applies to all branches except the production branch

---

## Environment Types in Vercel

| Environment | When It's Used |
|-------------|----------------|
| **Production** | Only for the production branch (usually `main`) |
| **Preview** | For ALL branch deployments (including `dev`) |
| **Development** | For local development (not used in Vercel) |

**For your `dev` branch:** Use **"Preview"** environment!

---

## Quick Checklist

- [ ] `NODE_ENV` = `development` (Preview environment)
- [ ] `DISABLE_MFA_TEMPORARILY` = `true` (Preview environment)
- [ ] Both variables show "Preview" in the Environments column
- [ ] Redeployed after setting variables
- [ ] Test endpoint shows correct values
- [ ] Login bypass now works

---

## Still Not Working?

If after following these steps the test endpoint still shows wrong values:

1. **Double-check environment scope:**
   - Go to Settings → Environment Variables
   - Verify both variables show "Preview" in the list

2. **Check for duplicate variables:**
   - Make sure you don't have the same variable set for multiple environments
   - If you do, the order matters (Preview should override Production)

3. **Verify deployment:**
   - Make sure you're checking the deployment that was created AFTER you set the variables
   - Check the deployment timestamp

4. **Clear browser cache:**
   - The test endpoint might be cached
   - Try: `https://dev.dukanest.com/api/test-env?t=123456` (add random query param)

---

## Related Documentation

- [Temporary 2FA Bypass Guide](./TEMPORARY_2FA_BYPASS.md)
- [Vercel Development Environment Setup](./VERCEL_DEV_ENVIRONMENT.md)
- [Vercel Log Troubleshooting](./VERCEL_LOG_TROUBLESHOOTING.md)

---

**Last Updated:** 2024
