# Vercel Development Environment Setup

**Quick guide for setting up a development environment on Vercel using preview deployments**

---

## Quick Start (Recommended: Preview Deployments)

This is the recommended approach - use a development branch with Vercel's automatic preview deployments. No need to create a separate project!

### Step 1: Create Development Branch

```bash
# Create development branch from your current branch
git checkout -b dev

# Push to GitHub
git push -u origin dev
```

**What happens:** Vercel automatically creates a preview deployment for your `dev` branch.

### Step 2: Configure Environment Variables for Preview

1. Go to your **existing Vercel project** → **Settings → Environment Variables**
2. Add these **critical** variables with **"Preview"** environment selected:

```env
# REQUIRED: Must be 'development' for 2FA bypass to work
NODE_ENV=development

# Enable 2FA bypass (temporary)
DISABLE_MFA_TEMPORARILY=true

# Your Supabase credentials (use dev project if possible)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://...

# App URL (will be your preview URL)
NEXT_PUBLIC_APP_URL=https://dukanest-git-dev-yourteam.vercel.app

# SendGrid (optional - can be same as production)
SENDGRID_API_KEY=your-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

3. **Important:** When adding each variable, select **"Preview"** (not "Production")
4. Click **"Save"**

### Step 3: Verify Preview Deployment

1. Check your Vercel dashboard - you should see a new deployment for the `dev` branch
2. Access your preview at: `https://dukanest-git-dev-yourteam.vercel.app`
3. The URL format is: `https://[project-name]-git-[branch-name]-[team].vercel.app`

---

## Quick Workflow Summary

| Step | Command / Action | What Happens on Vercel |
|------|-----------------|------------------------|
| **Create branch** | `git checkout -b dev` | - |
| **Push branch** | `git push -u origin dev` | ✅ Auto → Preview Deployment created |
| **Make changes** | `Edit → commit → git push` | ✅ New preview build & URL (updates automatically) |
| **Test/QA** | `Open preview URL` | ✅ Safe testing, no effect on production |
| **Ready for prod?** | `Create PR: dev → main` | ✅ Vercel comments preview link in PR |
| **Merge PR** | `Merge on GitHub` | ✅ Triggers Production Deployment on main |

---

## Daily Development Workflow

### Working on Features

```bash
# 1. Switch to dev branch
git checkout dev

# 2. Make your changes
# ... edit files ...

# 3. Commit and push
git add .
git commit -m "Feature: add new feature"
git push origin dev

# 4. Vercel automatically creates/updates preview deployment
# 5. Test at the preview URL shown in Vercel dashboard
```

### Deploying to Production

```bash
# Option 1: Create Pull Request (Recommended)
# - Go to GitHub
# - Create PR: dev → main
# - Vercel will comment with preview link
# - Review and test
# - Merge PR → Triggers production deployment

# Option 2: Direct Merge
git checkout main
git merge dev
git push origin main
# Vercel auto-deploys to production
```

---

## Vercel Settings to Configure

### Production Branch Setting

1. Go to **Vercel Dashboard → Your Project → Settings → Git**
2. **Production Branch:** Should be set to `main` (or whatever your live branch is)
   - This is the only branch that updates your custom domain
   - All other branches create preview deployments

### Environment Variables Scope

Make sure your variables are set correctly:

- **Production:** Used only for `main` branch deployments
- **Preview:** Used for all branch deployments (including `dev`)
- **Development:** Only used if you create a separate project (not needed for this workflow)

### Optional: Custom Domain for Dev Branch

1. Go to **Settings → Domains**
2. Click **"Assign to Git Branch"**
3. Assign a domain like `dev.yourdomain.com` to the `dev` branch
4. This gives you a consistent URL instead of the auto-generated preview URL

---

## Environment Comparison

| Setting | Production (main branch) | Development (dev branch) |
|---------|-------------------------|-------------------------|
| **Branch** | `main` or `master` | `dev` |
| **NODE_ENV** | `production` (default) | `development` (set in Preview env vars) |
| **DISABLE_MFA_TEMPORARILY** | `false` (or not set) | `true` (set in Preview env vars) |
| **Database** | Production Supabase | Dev Supabase (recommended) |
| **URL** | `dukanest.vercel.app` | `dukanest-git-dev.vercel.app` |
| **Deployment Type** | Production | Preview |

---

## Alternative: Separate Vercel Project

If you prefer a completely separate project (not recommended for this workflow):

1. Create a new Vercel project
2. Import the same repository
3. Select `dev` branch as the production branch for that project
4. Configure environment variables for "Development" environment

This gives you a separate project but requires more management. The preview deployment approach is simpler and recommended.

---

## Troubleshooting

### Bypass Not Working on Vercel?

1. **Check NODE_ENV:**
   - Must be set to `development` in Vercel environment variables
   - Vercel defaults to `production`, so you must override it
   - Make sure it's set for **"Preview"** environment

2. **Check Environment Scope:**
   - Variable must be set for **"Preview"** environment (not just "Production")
   - Preview environment applies to all branch deployments

3. **Check Deployment Logs:**
   - Go to Vercel Dashboard → Your deployment → Logs
   - Look for: `[Login API] ⚠️ 2FA BYPASS ENABLED`
   - If you don't see this, bypass isn't active

4. **Redeploy:**
   - Environment variable changes require a new deployment
   - Push a new commit: `git commit --allow-empty -m "Trigger redeploy" && git push`
   - Or redeploy from Vercel dashboard: Deployments → Click "..." → "Redeploy"

### Environment Variables Not Working?

- **Restart deployment:** Go to Vercel dashboard → Deployments → Click "..." → "Redeploy"
- **Check spelling:** `DISABLE_MFA_TEMPORARILY` (not `DISABLE_MFA`)
- **Check scope:** Make sure variable is set for **"Preview"** environment (not just "Production")
- **Verify branch:** Make sure you're pushing to `dev` branch, not `main`

### Preview Deployment Not Created?

- **Check branch name:** Vercel creates previews for all branches except the production branch
- **Verify Git integration:** Go to Settings → Git → Check repository is connected
- **Check build logs:** Look for any build errors that might prevent deployment

---

## Best Practices

1. **Use Separate Supabase Project:**
   - Create a separate Supabase project for development
   - Prevents accidental data corruption in production
   - Allows database resets for testing

2. **Keep Environments Separate:**
   - Never merge development code directly to main
   - Always test in preview deployment first
   - Use pull requests for code review (Vercel will comment with preview link)

3. **Remove Bypass When Ready:**
   - Once SendGrid is approved, disable bypass
   - Set `DISABLE_MFA_TEMPORARILY=false` in development
   - Test 2FA flow before deploying to production

4. **Monitor Both Environments:**
   - Check Vercel logs for both production and preview deployments
   - Monitor Supabase usage for both environments
   - Set up alerts for errors
   - Use Vercel's deployment comments in GitHub PRs to track preview deployments

---

## Quick Reference

**Enable Bypass:**
```env
NODE_ENV=development
DISABLE_MFA_TEMPORARILY=true
```

**Disable Bypass:**
```env
DISABLE_MFA_TEMPORARILY=false
# or remove the variable
```

**Check Status:**
- Look for bypass warning in deployment logs
- Try logging in - should work without 2FA if enabled

---

## Related Documentation

- [Temporary 2FA Bypass Guide](./TEMPORARY_2FA_BYPASS.md) - Detailed bypass instructions
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment
- [Development Guide](./DEVELOPMENT.md) - Local development setup

---

**Last Updated:** 2024
