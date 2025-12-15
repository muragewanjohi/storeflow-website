# Day 46-47: Quick Start Deployment Guide

**Quick reference for deploying StoreFlow to production**

---

## 🚀 Quick Deployment Steps

### 1. Supabase Production Setup

```bash
# 1. Create production Supabase project
# Go to: https://supabase.com/dashboard → New Project

# 2. Get credentials from Supabase Dashboard
# Settings → API → Copy keys
# Settings → Database → Copy connection strings

# 3. Run database migrations
cd C:\xampp\htdocs\storeflow
$env:DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-1-[region].pooler.supabase.com:5432/postgres"
npm run db:migrate:deploy
npm run db:generate

# 4. Verify RLS policies
npm run deploy:verify-rls
```

### 2. Vercel Deployment

```bash
# 1. Connect repository to Vercel
# Go to: https://vercel.com/dashboard → Add New Project

# 2. Configure project
# - Framework: Next.js
# - Root Directory: storeflow
# - Build Command: npm run build

# 3. Add environment variables in Vercel Dashboard
# Project Settings → Environment Variables
# Add all variables from .env.production

# 4. Deploy
# Click "Deploy" and wait for build to complete
```

### 3. Domain Verification

```bash
# 1. Verify domains in Vercel
# Project Settings → Domains
# Should show: www.dukanest.com, dukanest.com, *.dukanest.com

# 2. Verify SSL certificates
npm run deploy:verify-ssl

# 3. Test subdomain routing
# Visit: https://test-deployment.dukanest.com
```

### 4. Smoke Tests

```bash
# Run production smoke tests
npm run deploy:smoke-tests https://www.dukanest.com
```

### 5. Monitoring Setup

1. **Vercel Analytics:**
   - Project Settings → Analytics → Enable Web Analytics

2. **Error Tracking:**
   - Option A: Use Vercel logs (built-in)
   - Option B: Set up Sentry (recommended)

3. **Uptime Monitoring:**
   - Set up UptimeRobot or Pingdom
   - Monitor: https://www.dukanest.com

---

## 📋 Environment Variables Checklist

Add these to Vercel Dashboard → Project Settings → Environment Variables:

### Required:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `DATABASE_URL`
- [ ] `VERCEL_TOKEN`
- [ ] `VERCEL_PROJECT_ID`
- [ ] `SENDGRID_API_KEY`
- [ ] `SENDGRID_FROM_EMAIL`
- [ ] `SENDGRID_FROM_NAME`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `MARKETING_DOMAIN`
- [ ] `NODE_ENV` = `production`
- [ ] `CRON_SECRET_TOKEN`

### Optional:
- [ ] `PESAPAL_CONSUMER_KEY`
- [ ] `PESAPAL_CONSUMER_SECRET`
- [ ] `PESAPAL_ENVIRONMENT`

---

## 🔍 Verification Commands

```bash
# Verify RLS policies
npm run deploy:verify-rls

# Run smoke tests
npm run deploy:smoke-tests https://www.dukanest.com

# Verify SSL certificates
npm run deploy:verify-ssl

# Check build locally
npm run verify
```

---

## 📚 Full Documentation

For detailed instructions, see:
- **[DAY_46_47_DEPLOYMENT.md](./DAY_46_47_DEPLOYMENT.md)** - Complete deployment guide
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - General deployment reference
- **[VERCEL_DOMAIN_SETUP_GUIDE.md](./VERCEL_DOMAIN_SETUP_GUIDE.md)** - Domain configuration

---

## ⚠️ Common Issues

### Build Fails
- Check build logs in Vercel
- Verify all environment variables are set
- Ensure `package.json` scripts are correct

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Check Supabase IP allowlist (if enabled)
- Use connection pooling URL (port 6543)

### Subdomain Not Working
- Check DNS propagation (can take up to 48 hours)
- Verify wildcard DNS record
- Check SSL certificate status

---

## ✅ Pre-Launch Checklist

- [ ] All environment variables set in Vercel
- [ ] Database migrations completed
- [ ] RLS policies verified
- [ ] Storage buckets created
- [ ] SSL certificates valid
- [ ] DNS configuration correct
- [ ] Subdomain routing works
- [ ] Authentication works
- [ ] Email sending works
- [ ] Cron jobs configured
- [ ] Monitoring set up
- [ ] Error tracking configured
- [ ] Uptime monitoring active

---

**Last Updated:** 2024
