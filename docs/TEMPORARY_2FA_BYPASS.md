# Temporary 2FA Bypass Guide

**⚠️ IMPORTANT: This is a temporary workaround for development/testing only**

---

## When to Use This

Use this bypass **only** when:
- ✅ Waiting for SendGrid account approval (up to 72 hours)
- ✅ Email service is temporarily unavailable
- ✅ Testing in development environment
- ✅ Email service configuration is in progress

**⚠️ NEVER use this in production!**

---

## How to Enable 2FA Bypass

### Step 1: Open Your Environment File

Open your `.env.local` file (or create it from `env.template`):

```bash
# Windows PowerShell
notepad .env.local

# Or use your preferred editor
code .env.local
```

### Step 2: Add the Bypass Flag

Add this line to your `.env.local` file:

```env
DISABLE_MFA_TEMPORARILY=true
```

**Important:** Make sure `NODE_ENV=development` is also set (it should be by default).

### Step 3: Restart Your Development Server

```bash
# Stop your current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Test Login

1. Go to your admin login page: `http://localhost:3000/dashboard/login`
2. Enter your email and password
3. You should now be logged in **without** needing the 2FA code
4. You'll see a warning message indicating 2FA is bypassed

---

## How It Works

The bypass:
- ✅ Only works when `NODE_ENV=development` or `NODE_ENV=test`
- ✅ Completely skips the OTP email sending step
- ✅ Logs warnings to console for visibility
- ✅ Returns a warning message in the response
- ❌ **Will NOT work in production** (automatically disabled)

---

## Security Notes

### What This Bypass Does:
- Allows login without 2FA verification
- Skips email OTP generation and sending
- Completes authentication immediately after password verification

### Security Implications:
- ⚠️ **Reduces security** - No second factor authentication
- ⚠️ **Development only** - Automatically disabled in production
- ⚠️ **Temporary** - Should be removed once email service is ready

### Best Practices:
1. **Use only when necessary** - Don't leave this enabled longer than needed
2. **Remove immediately** - Once SendGrid is approved, disable this flag
3. **Monitor logs** - Check console for bypass warnings
4. **Test properly** - Once email service works, test 2FA flow

---

## How to Disable the Bypass

### Step 1: Update Environment File

Open `.env.local` and either:
- Remove the line: `DISABLE_MFA_TEMPORARILY=true`
- Or set it to: `DISABLE_MFA_TEMPORARILY=false`

### Step 2: Restart Server

```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 3: Test 2FA Flow

1. Try logging in
2. You should now be prompted for 2FA code
3. Check your email for the 6-digit code
4. Enter code to complete login

---

## Troubleshooting

### Bypass Not Working?

1. **Check environment variable:**
   ```bash
   # Verify it's set correctly
   echo $DISABLE_MFA_TEMPORARILY  # Linux/Mac
   $env:DISABLE_MFA_TEMPORARILY   # Windows PowerShell
   ```

2. **Check NODE_ENV:**
   ```bash
   # Must be 'development' or 'test'
   echo $NODE_ENV
   ```

3. **Check server logs:**
   - Look for: `[Login API] ⚠️ 2FA BYPASS ENABLED`
   - If you don't see this, the bypass isn't active

4. **Restart server:**
   - Environment variables are loaded at startup
   - Changes require server restart

### Still Seeing 2FA Prompt?

- Verify `.env.local` file is in the project root
- Check for typos: `DISABLE_MFA_TEMPORARILY` (not `DISABLE_MFA`)
- Ensure `NODE_ENV=development` is set
- Restart your development server

---

## After SendGrid Approval

Once SendGrid approves your account (within 72 hours):

1. **Disable the bypass:**
   ```env
   DISABLE_MFA_TEMPORARILY=false
   ```

2. **Restart server:**
   ```bash
   npm run dev
   ```

3. **Test 2FA:**
   - Login should now require 2FA code
   - Check email for OTP code
   - Verify login completes successfully

4. **Remove the flag:**
   - Optionally remove `DISABLE_MFA_TEMPORARILY` from `.env.local`
   - The system will default to requiring 2FA

---

## Code Location

The bypass logic is implemented in:
- **File:** `src/app/api/auth/tenant/login/route.ts`
- **Line:** ~232-250 (check for `bypassMFA` variable)

To review or modify the bypass logic, check this file.

---

## Summary

**Quick Enable:**
```env
DISABLE_MFA_TEMPORARILY=true
```

**Quick Disable:**
```env
DISABLE_MFA_TEMPORARILY=false
```

**Remember:**
- ✅ Development/test only
- ✅ Temporary solution
- ✅ Remove once email service is ready
- ❌ Never use in production

---

## Setting Up Development Environment on Vercel

If you want to deploy a development environment on Vercel (useful for testing without local setup), follow these steps:

### Recommended: Use Preview Deployments

This is the simplest approach - use a development branch with Vercel's automatic preview deployments. No need to create a separate project!

#### Step 1: Create Development Branch

```bash
# Create and switch to development branch
git checkout -b dev

# Push to GitHub
git push -u origin dev
```

**What happens:** Vercel automatically creates a preview deployment for your `dev` branch.

#### Step 2: Configure Environment Variables for Preview

1. **Go to your existing Vercel project → Settings → Environment Variables**
2. **Add/Update these variables with "Preview" environment selected:**

```env
# Set NODE_ENV to development (required for bypass to work)
NODE_ENV=development

# Enable 2FA bypass
DISABLE_MFA_TEMPORARILY=true

# Use development Supabase project (or same as production)
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-role-key
DATABASE_URL=postgresql://...your-dev-database...

# Development app URL (will be your preview URL)
NEXT_PUBLIC_APP_URL=https://storeflow-git-dev-yourteam.vercel.app

# SendGrid (optional - can be same as production or different)
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=StoreFlow Dev
```

3. **Important:** Make sure to select **"Preview"** environment when adding variables
4. **Click "Save"**

#### Step 3: Access Preview Deployment

- Vercel automatically creates preview deployments for all branches
- Access at: `https://storeflow-git-dev-yourteam.vercel.app`
- Or check the Vercel dashboard for the preview URL
- The URL format is: `https://[project-name]-git-[branch-name]-[team].vercel.app`

#### Workflow Summary

| Step | Command / Action | What Happens on Vercel |
|------|-----------------|------------------------|
| **Create branch** | `git checkout -b dev` | - |
| **Push branch** | `git push -u origin dev` | ✅ Auto → Preview Deployment created |
| **Make changes** | `Edit → commit → git push` | ✅ New preview build & URL (updates automatically) |
| **Test/QA** | `Open preview URL` | ✅ Safe testing, no effect on production |
| **Ready for prod?** | `Create PR: dev → main` | ✅ Vercel comments preview link in PR |
| **Merge PR** | `Merge on GitHub` | ✅ Triggers Production Deployment on main |

### Alternative: Separate Vercel Project

If you prefer a completely separate project:

1. **Create a new Vercel project**
2. **Import the same repository** but select the `dev` branch
3. **Configure environment variables** for "Development" environment
4. **Access at:** `https://storeflow-dev.vercel.app`

This gives you a separate project but requires more management. The preview deployment approach is simpler and recommended.

### Important Notes for Vercel Development Environment

1. **NODE_ENV Requirement:**
   - The bypass **only works** when `NODE_ENV=development` or `NODE_ENV=test`
   - Vercel sets `NODE_ENV=production` by default
   - **You must explicitly set `NODE_ENV=development`** in Vercel environment variables

2. **Environment Variable Scope:**
   - **Production:** Used for main branch deployments
   - **Preview:** Used for all branch deployments (except main)
   - **Development:** Only used if you create a separate project

3. **Database Considerations:**
   - Use a **separate Supabase project** for development (recommended)
   - Or use the same database but be careful with test data
   - Development database can be reset without affecting production

4. **SendGrid Setup:**
   - You can use the same SendGrid account for both environments
   - Or wait for approval and use bypass in development only

### Quick Setup Checklist

- [ ] Create `development` branch (or use preview)
- [ ] Create separate Vercel project (or configure preview env vars)
- [ ] Set `NODE_ENV=development` in Vercel environment variables
- [ ] Set `DISABLE_MFA_TEMPORARILY=true` in Vercel environment variables
- [ ] Configure Supabase credentials (dev project recommended)
- [ ] Deploy and test login
- [ ] Verify bypass is working (check console logs)

### Testing the Bypass on Vercel

1. **Deploy your development branch/preview**
2. **Check deployment logs** for:
   ```
   [Login API] ⚠️ 2FA BYPASS ENABLED
   ```
3. **Try logging in** - should work without 2FA code
4. **Check response** - should include warning message about bypass

### Switching Between Environments

**To work on development:**
```bash
git checkout development
# Make changes
git push origin development
# Vercel auto-deploys
```

**To work on production:**
```bash
git checkout main  # or master
# Make changes
git push origin main
# Vercel auto-deploys to production
```

---

**Questions?** Check the [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md) or review the login route code.
