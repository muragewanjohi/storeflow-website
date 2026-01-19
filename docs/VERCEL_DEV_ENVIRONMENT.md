# Vercel Development Environment Setup

**Quick guide for setting up a development environment on Vercel when you only have one branch**

---

## Quick Start (One Branch Setup)

If you only have one branch (`main` or `master`), here's the fastest way to set up a development environment:

### Step 1: Create Development Branch

```bash
# Create development branch from your current branch
git checkout -b development

# Push to GitHub
git push -u origin development
```

### Step 2: Create New Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your repository
4. **Important:** Select the `development` branch (not `main`)
5. Name it: `storeflow-dev` (or similar)
6. Click **"Import"**

### Step 3: Configure Environment Variables

1. In your new Vercel project, go to **Settings → Environment Variables**
2. Add these **critical** variables for **Development** environment:

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

# App URL
NEXT_PUBLIC_APP_URL=https://storeflow-dev.vercel.app

# SendGrid (optional - can be same as production)
SENDGRID_API_KEY=your-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

3. **Make sure to select "Development"** when adding each variable
4. Click **"Save"**

### Step 4: Deploy

```bash
# Make sure you're on development branch
git checkout development

# Push any changes
git push origin development
```

Vercel will automatically deploy your `development` branch to the dev project.

---

## Environment Comparison

| Setting | Production Project | Development Project |
|---------|-------------------|---------------------|
| **Branch** | `main` or `master` | `development` |
| **NODE_ENV** | `production` | `development` |
| **DISABLE_MFA_TEMPORARILY** | `false` (or not set) | `true` |
| **Database** | Production Supabase | Dev Supabase (recommended) |
| **URL** | `storeflow.vercel.app` | `storeflow-dev.vercel.app` |

---

## Workflow

### Daily Development

```bash
# Work on development branch
git checkout development

# Make changes, commit, push
git add .
git commit -m "Feature: add new feature"
git push origin development

# Vercel auto-deploys to dev environment
# Test at: https://storeflow-dev.vercel.app
```

### Deploy to Production

```bash
# Merge development into main
git checkout main
git merge development
git push origin main

# Vercel auto-deploys to production
# Live at: https://storeflow.vercel.app
```

---

## Alternative: Using Preview Deployments

If you don't want a separate project, use Vercel's preview deployments:

1. **Create a feature branch:**
   ```bash
   git checkout -b dev-preview
   git push -u origin dev-preview
   ```

2. **In your main Vercel project**, go to **Settings → Environment Variables**
3. **Add variables with "Preview" environment selected:**
   ```env
   NODE_ENV=development
   DISABLE_MFA_TEMPORARILY=true
   # ... other vars
   ```

4. **Access preview at:** `https://storeflow-git-dev-preview.vercel.app`

---

## Troubleshooting

### Bypass Not Working on Vercel?

1. **Check NODE_ENV:**
   - Must be set to `development` in Vercel environment variables
   - Vercel defaults to `production`, so you must override it

2. **Check Environment Scope:**
   - Variable must be set for "Development" or "Preview" environment
   - Not just "Production"

3. **Check Deployment Logs:**
   - Look for: `[Login API] ⚠️ 2FA BYPASS ENABLED`
   - If you don't see this, bypass isn't active

4. **Redeploy:**
   - Environment variable changes require a new deployment
   - Push a new commit or redeploy from Vercel dashboard

### Environment Variables Not Working?

- **Restart deployment:** Go to Vercel dashboard → Deployments → Click "Redeploy"
- **Check spelling:** `DISABLE_MFA_TEMPORARILY` (not `DISABLE_MFA`)
- **Check scope:** Make sure variable is set for correct environment (Development/Preview)

---

## Best Practices

1. **Use Separate Supabase Project:**
   - Create a separate Supabase project for development
   - Prevents accidental data corruption in production
   - Allows database resets for testing

2. **Keep Environments Separate:**
   - Never merge development code directly to main
   - Always test in development first
   - Use pull requests for code review

3. **Remove Bypass When Ready:**
   - Once SendGrid is approved, disable bypass
   - Set `DISABLE_MFA_TEMPORARILY=false` in development
   - Test 2FA flow before deploying to production

4. **Monitor Both Environments:**
   - Check Vercel logs for both projects
   - Monitor Supabase usage for both projects
   - Set up alerts for errors

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
