# Deployment Guide

**Complete guide for deploying Dukanest to production**

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Supabase Production Setup](#supabase-production-setup)
4. [Vercel Deployment](#vercel-deployment)
5. [Domain Configuration](#domain-configuration)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-Deployment Checklist

### Code Preparation

- [ ] All tests passing (`npm run test:all`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors or warnings
- [ ] All environment variables documented
- [ ] Database migrations ready
- [ ] RLS policies verified

### Security

- [ ] All secrets in environment variables (not in code)
- [ ] API keys rotated for production
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] SSL/HTTPS configured
- [ ] Security headers configured

### Performance

- [ ] Images optimized
- [ ] Code splitting implemented
- [ ] Caching configured
- [ ] Database indexes created
- [ ] CDN configured

### Documentation

- [ ] API documentation updated
- [ ] User guides complete
- [ ] Admin documentation complete
- [ ] Deployment guide reviewed

---

## Environment Setup

### Required Environment Variables

Create a `.env.production` file (or set in Vercel dashboard):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Vercel
VERCEL_URL=your-app.vercel.app
VERCEL_PROJECT_ID=your-project-id
VERCEL_TOKEN=your-vercel-token

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@dukanest.com
SENDGRID_FROM_NAME=Dukanest

# Application
NEXT_PUBLIC_APP_URL=https://www.dukanest.com
NODE_ENV=production

# Cron Jobs (optional but recommended)
CRON_SECRET_TOKEN=your-secret-token

# Optional: Payment Gateways
PESAPAL_CONSUMER_KEY=your-key
PESAPAL_CONSUMER_SECRET=your-secret
PESAPAL_ENVIRONMENT=production
```

### Environment Variable Security

⚠️ **Important:**
- Never commit `.env.production` to git
- Use Vercel's environment variable settings
- Rotate keys regularly
- Use different keys for production vs development

---

## Supabase Production Setup

### Step 1: Create Production Project

1. **Go to Supabase Dashboard:** https://supabase.com/dashboard
2. **Click "New Project"**
3. **Fill in project details:**
   - Organization
   - Project Name: "Dukanest Production"
   - Database Password: (generate strong password)
   - Region: (choose closest to your users)
4. **Click "Create new project"**
5. **Wait for project to be created** (2-3 minutes)

### Step 2: Database Migration

1. **Get connection string:**
   - Go to Project Settings → Database
   - Copy "Connection string" (URI format)
   - Update `DATABASE_URL` in environment variables

2. **Run migrations:**
   ```bash
   # Set production database URL
   export DATABASE_URL="postgresql://..."
   
   # Run migrations
   npx prisma migrate deploy
   
   # Generate Prisma Client
   npx prisma generate
   ```

3. **Verify migrations:**
   ```bash
   npx prisma studio
   # Check that all tables exist
   ```

### Step 3: RLS Policies

1. **Verify RLS is enabled:**
   ```sql
   -- Check RLS status
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

2. **Run RLS migration:**
   ```bash
   # Apply RLS policies from migration file
   npx supabase db push
   # Or manually run SQL from supabase/migrations/002_setup_rls_policies.sql
   ```

3. **Test RLS policies:**
   - Create test tenant
   - Verify tenant isolation works
   - Test that tenants can't access other tenants' data

### Step 4: Storage Setup

1. **Create storage buckets:**
   - Go to Storage → Buckets
   - Create buckets:
     - `product-images` (public)
     - `media-uploads` (public)
     - `documents` (private)

2. **Configure bucket policies:**
   - Set public access for product-images and media-uploads
   - Set private access for documents
   - Configure CORS if needed

### Step 5: Authentication Setup

1. **Configure email settings:**
   - Go to Authentication → Settings
   - Set up SMTP (or use Supabase email)
   - Configure email templates

2. **Set up redirect URLs:**
   - Add production URLs to allowed redirect URLs
   - Add password reset URLs
   - Add email verification URLs

3. **Configure OAuth (if using):**
   - Set up OAuth providers
   - Add OAuth redirect URLs

### Step 6: Environment Variables in Supabase

1. **Go to Project Settings → API**
2. **Copy keys:**
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Vercel Deployment

### Step 1: Connect Repository

1. **Go to Vercel Dashboard:** https://vercel.com/dashboard
2. **Click "Add New Project"**
3. **Import Git Repository:**
   - Select your repository
   - Choose branch (usually `main` or `master`)
   - Click "Import"

### Step 2: Configure Project

1. **Project Settings:**
   - Framework Preset: Next.js
   - Root Directory: `storeflow` (if monorepo)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

2. **Environment Variables:**
   - Add all environment variables from `.env.production`
   - Set for Production, Preview, and Development
   - Click "Save"

### Step 3: Deploy

1. **Click "Deploy"**
2. **Wait for build to complete** (5-10 minutes)
3. **Check build logs** for any errors
4. **Verify deployment** at provided URL

### Step 4: Custom Domain

1. **Go to Project Settings → Domains**
2. **Add Domain:**
   - Enter `www.dukanest.com`
   - Click "Add"
3. **Configure DNS:**
   - Follow Vercel's DNS instructions
   - Add CNAME or A records to your DNS provider
   - Wait for DNS propagation (up to 48 hours)

4. **Add Apex Domain:**
   - Add `dukanest.com` (without www)
   - Configure DNS as instructed
   - Vercel handles both www and apex

5. **Verify SSL:**
   - Vercel automatically provisions SSL certificates
   - Wait for certificate issuance (usually instant)
   - Verify HTTPS is working

### Step 5: Wildcard Subdomain

1. **Add Wildcard Domain:**
   - Go to Domains
   - Add `*.dukanest.com`
   - Configure DNS:
     - Add CNAME record: `*` → `cname.vercel-dns.com`
   - Wait for DNS propagation

2. **Test Subdomain:**
   - Create a test tenant
   - Verify subdomain works: `teststore.dukanest.com`
   - Check SSL certificate

---

## Domain Configuration

### DNS Setup

#### For Namecheap (or similar)

1. **Go to Domain List → Manage → Advanced DNS**

2. **Add Records:**
   ```
   Type: A Record
   Host: @
   Value: 76.76.21.21 (Vercel's IP)
   TTL: Automatic
   
   Type: CNAME Record
   Host: www
   Value: cname.vercel-dns.com
   TTL: Automatic
   
   Type: CNAME Record
   Host: *
   Value: cname.vercel-dns.com
   TTL: Automatic
   ```

3. **Save Changes**

4. **Wait for Propagation:**
   - Usually 1-24 hours
   - Check with: `dig dukanest.com` or online DNS checker

### Email DNS (SendGrid)

If using SendGrid for transactional emails:

1. **Add SPF Record:**
   ```
   Type: TXT
   Host: @
   Value: v=spf1 include:sendgrid.net ~all
   ```

2. **Add DKIM Record:**
   - Get from SendGrid dashboard
   - Add as TXT record

3. **Add DMARC Record:**
   ```
   Type: TXT
   Host: _dmarc
   Value: v=DMARC1; p=none; rua=mailto:dmarc@dukanest.com
   ```

See [SendGrid DNS Setup Guide](./VERCEL_SENDGRID_DNS_SETUP.md) for details.

---

## Post-Deployment Verification

### Step 1: Basic Checks

- [ ] Homepage loads correctly
- [ ] SSL certificate is valid
- [ ] All pages are accessible
- [ ] No console errors
- [ ] Images load correctly
- [ ] Forms work

### Step 2: Authentication

- [ ] Landlord login works
- [ ] Tenant admin login works
- [ ] Customer registration works
- [ ] Password reset works
- [ ] Email verification works

### Step 3: Tenant Creation

- [ ] Create test tenant
- [ ] Subdomain works: `teststore.dukanest.com`
- [ ] SSL certificate for subdomain
- [ ] Tenant admin can log in
- [ ] Storefront loads correctly

### Step 4: Core Features

- [ ] Products can be created
- [ ] Orders can be placed
- [ ] Checkout works
- [ ] Email notifications sent
- [ ] Analytics work

### Step 5: Performance

- [ ] Page load times < 3 seconds
- [ ] Images optimized
- [ ] API responses fast
- [ ] No memory leaks
- [ ] Database queries optimized

### Step 6: Security

- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] Rate limiting works
- [ ] RLS policies enforced
- [ ] No sensitive data exposed

---

## Monitoring & Maintenance

### Vercel Analytics

1. **Enable Vercel Analytics:**
   - Go to Project Settings → Analytics
   - Enable Web Analytics
   - View metrics in dashboard

2. **Monitor:**
   - Page views
   - Performance metrics
   - Error rates
   - User behavior

### Error Tracking

1. **Set up error tracking:**
   - Use Sentry, LogRocket, or similar
   - Configure error reporting
   - Set up alerts

2. **Monitor:**
   - JavaScript errors
   - API errors
   - Database errors
   - Performance issues

### Database Monitoring

1. **Supabase Dashboard:**
   - Monitor database usage
   - Check query performance
   - View connection pool status

2. **Set up alerts:**
   - Database size limits
   - Connection limits
   - Query performance

### Backup Strategy

1. **Database Backups:**
   - Supabase provides automatic backups
   - Configure backup retention
   - Test restore process

2. **Code Backups:**
   - Git repository is backup
   - Tag releases
   - Keep deployment history

### Cron Jobs

1. **Verify cron jobs:**
   - Check `vercel.json` for cron configuration
   - Test cron endpoints
   - Monitor cron execution

2. **Cron Jobs:**
   - Subscription expiry checker (daily)
   - Payment reminders (daily)
   - Analytics aggregation (daily)
   - Data cleanup (weekly)

### Updates & Maintenance

1. **Regular Updates:**
   - Update dependencies monthly
   - Apply security patches immediately
   - Test updates in staging first

2. **Monitoring:**
   - Check for dependency vulnerabilities
   - Monitor package updates
   - Review changelogs

3. **Deployment Process:**
   - Test in staging environment
   - Create feature branch
   - Test thoroughly
   - Deploy to production
   - Monitor for issues

---

## Troubleshooting

### Common Issues

#### Build Failures

**Issue:** Build fails on Vercel

**Solutions:**
- Check build logs for errors
- Verify all environment variables are set
- Ensure `package.json` has correct scripts
- Check Node.js version compatibility

#### Database Connection Errors

**Issue:** Cannot connect to database

**Solutions:**
- Verify `DATABASE_URL` is correct
- Check database is accessible from Vercel
- Verify IP allowlist in Supabase (if enabled)
- Check connection pool limits

#### Subdomain Not Working

**Issue:** Tenant subdomain doesn't load

**Solutions:**
- Verify DNS propagation
- Check Vercel domain configuration
- Verify wildcard DNS record
- Check SSL certificate status

#### Email Not Sending

**Issue:** Emails not being sent

**Solutions:**
- Verify SendGrid API key
- Check SendGrid account status
- Verify sender email is verified
- Check email logs in SendGrid dashboard

#### RLS Policy Errors

**Issue:** Users can't access their data

**Solutions:**
- Verify RLS is enabled on tables
- Check RLS policies are correct
- Test with different user roles
- Review tenant context setting

### Getting Help

1. **Check Documentation:**
   - [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md)
   - [API Documentation](./API_DOCUMENTATION.md)
   - [Architecture Documentation](./ARCHITECTURE.md)

2. **Review Logs:**
   - Vercel function logs
   - Supabase logs
   - Browser console
   - Server logs

3. **Contact Support:**
   - Create GitHub issue
   - Check existing issues
   - Review community forums

---

## Rollback Procedure

If deployment causes issues:

1. **Revert Code:**
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Revert in Vercel:**
   - Go to Deployments
   - Find previous working deployment
   - Click "..." → "Promote to Production"

3. **Revert Database:**
   ```bash
   # Rollback last migration
   npx prisma migrate resolve --rolled-back <migration-name>
   ```

4. **Verify Rollback:**
   - Test all critical features
   - Monitor for errors
   - Check analytics

---

## Related Documentation

- [Pre-Deployment Checks](./PRE_DEPLOYMENT_CHECKS.md)
- [Vercel Domain Setup Guide](./VERCEL_DOMAIN_SETUP_GUIDE.md)
- [Supabase Storage Setup](./SUPABASE_STORAGE_SETUP.md)
- [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md)

---

**Last Updated:** 2024

