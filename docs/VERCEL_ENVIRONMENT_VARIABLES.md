# Vercel Environment Variables Setup Guide

This guide explains how to set up all required environment variables in your Vercel project.

## Required Environment Variables

### Supabase Configuration

These are **CRITICAL** - your application will not work without them:

1. **`NEXT_PUBLIC_SUPABASE_URL`**
   - Your Supabase project URL
   - Format: `https://xxxxxxxxxxxxx.supabase.co`
   - Find it in: Supabase Dashboard → Project Settings → API → Project URL

2. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
   - Your Supabase anonymous/public key
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Find it in: Supabase Dashboard → Project Settings → API → Project API keys → `anon` `public`

3. **`SUPABASE_SERVICE_ROLE_KEY`**
   - Your Supabase service role key (⚠️ **KEEP SECRET**)
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Find it in: Supabase Dashboard → Project Settings → API → Project API keys → `service_role` `secret`
   - **Important:** This key has admin access. Never expose it in client-side code.

### Vercel Configuration

4. **`VERCEL_TOKEN`**
   - Your Vercel API token
   - Find it in: Vercel Dashboard → Settings → Tokens → Create Token
   - Required for: Automatic subdomain creation

5. **`VERCEL_PROJECT_ID`**
   - Your Vercel project ID
   - Find it in: Vercel Dashboard → Project Settings → General → Project ID
   - Required for: Automatic subdomain creation

### Application Configuration

6. **`NEXT_PUBLIC_APP_URL`**
   - Your production application URL
   - Format: `https://www.dukanest.com` or `https://dukanest.com`
   - Used for: Generating login URLs in emails

7. **`MARKETING_DOMAIN`** (Optional)
   - Marketing site domain
   - Format: `www.dukanest.com` or `dukanest.com`
   - Used for: Middleware tenant resolution

### Email Configuration (SendGrid)

8. **`SENDGRID_API_KEY`**
   - Your SendGrid API key
   - Find it in: SendGrid Dashboard → Settings → API Keys → Create API Key
   - Required for: Sending transactional emails

9. **`SENDGRID_FROM_EMAIL`**
   - Default sender email address
   - Format: `noreply@dukanest.com`
   - Must be verified in SendGrid

10. **`SENDGRID_FROM_NAME`** (Optional)
    - Default sender name
    - Format: `DukaNest`
    - Default: `DukaNest`

### Database Configuration

11. **`DATABASE_URL`** (If using Prisma directly)
    - PostgreSQL connection string
    - Format: `postgresql://user:password@host:port/database?sslmode=require`
    - Usually provided by Supabase

### Optional: Caching (Vercel KV)

12. **`KV_REST_API_URL`** (Optional)
    - Vercel KV REST API URL
    - Format: `https://xxxxx.upstash.io`
    - Used for: Tenant lookup caching

13. **`KV_REST_API_TOKEN`** (Optional)
    - Vercel KV REST API token
    - Format: `xxxxx`
    - Used for: Tenant lookup caching

## How to Set Environment Variables in Vercel

### Method 1: Via Vercel Dashboard (Recommended)

1. Go to your Vercel project dashboard
2. Click on **Settings** → **Environment Variables**
3. Click **Add New**
4. Enter the variable name and value
5. Select the environments where it should be available:
   - **Production** (for production deployments)
   - **Preview** (for preview deployments)
   - **Development** (for local development - usually not needed)
6. Click **Save**
7. **Important:** After adding new variables, you need to **redeploy** your project for changes to take effect

### Method 2: Via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link your project (if not already linked)
vercel link

# Add environment variable
vercel env add NEXT_PUBLIC_SUPABASE_URL production

# Add more variables
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... etc

# Pull environment variables to local .env.local (optional)
vercel env pull .env.local
```

## Verification Checklist

After setting up environment variables, verify they are set correctly:

### ✅ Check in Vercel Dashboard

1. Go to **Settings** → **Environment Variables**
2. Verify all required variables are listed
3. Check that they're enabled for **Production** environment

### ✅ Check in Deployment Logs

1. Go to **Deployments** → Select latest deployment → **Logs**
2. Look for any errors about missing environment variables
3. The logs should NOT show: `"Your project's URL and Key are required to create a Supabase client!"`

### ✅ Test Application

1. Try to access a tenant subdomain (e.g., `https://cups.dukanest.com`)
2. Should NOT see "Store not found" error
3. Should be able to access the storefront

## Common Issues

### Issue: "Your project's URL and Key are required to create a Supabase client!"

**Cause:** Supabase environment variables are missing or incorrect.

**Solution:**
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel
2. Make sure they're enabled for **Production** environment
3. Redeploy your project after adding variables
4. Check that the values are correct (no extra spaces, correct format)

### Issue: "Store not found" after tenant creation

**Cause:** Could be multiple issues:
1. Supabase environment variables missing (see above)
2. Tenant not created in database
3. Cache issue

**Solution:**
1. Check Vercel logs for Supabase errors
2. Verify tenant exists in Supabase database
3. Clear cache (will auto-clear after 5 minutes)

### Issue: Subdomain not accessible (DEPLOYMENT_NOT_FOUND)

**Cause:** Vercel domain not added or environment variables missing.

**Solution:**
1. Verify `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` are set
2. Check Vercel logs for domain addition errors
3. Manually add domain in Vercel Dashboard if needed

## Security Best Practices

1. **Never commit `.env.local` to git** - It's already in `.gitignore`
2. **Use different Supabase projects** for development and production
3. **Rotate keys regularly** - Especially `SUPABASE_SERVICE_ROLE_KEY`
4. **Limit Vercel token permissions** - Only grant necessary scopes
5. **Use Vercel's environment variable encryption** - Variables are encrypted at rest

## Quick Setup Script

For convenience, here's a checklist of all variables to set:

```
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ VERCEL_TOKEN
✅ VERCEL_PROJECT_ID
✅ NEXT_PUBLIC_APP_URL
✅ SENDGRID_API_KEY
✅ SENDGRID_FROM_EMAIL
✅ SENDGRID_FROM_NAME (optional)
✅ DATABASE_URL (if needed)
✅ KV_REST_API_URL (optional)
✅ KV_REST_API_TOKEN (optional)
```

## Need Help?

If you're still experiencing issues:

1. Check Vercel deployment logs for specific error messages
2. Verify all environment variables are set correctly
3. Ensure you've redeployed after adding new variables
4. Check Supabase dashboard to verify project is active
5. Review this guide's "Common Issues" section

---

**Last Updated:** 2024-12-11

