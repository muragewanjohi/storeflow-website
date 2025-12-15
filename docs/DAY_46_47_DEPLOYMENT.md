# Day 46-47: Production Deployment Guide

**Complete guide for deploying StoreFlow to production**

---

## Table of Contents

1. [Day 46 Morning: Production Supabase Setup](#day-46-morning-production-supabase-setup)
2. [Day 46 Afternoon: Vercel Production Deployment](#day-46-afternoon-vercel-production-deployment)
3. [Day 47 Morning: Production Domain Verification](#day-47-morning-production-domain-verification)
4. [Day 47 Afternoon: Monitoring and Final Checks](#day-47-afternoon-monitoring-and-final-checks)

---

## Day 46 Morning: Production Supabase Setup

### Step 1: Create Production Supabase Project

1. **Go to Supabase Dashboard:** https://supabase.com/dashboard
2. **Click "New Project"**
3. **Fill in project details:**
   - Organization: Select your organization
   - Project Name: "StoreFlow Production"
   - Database Password: Generate a strong password (save it securely!)
   - Region: Choose closest to your users (e.g., `eu-west-1` for Europe, `us-east-1` for US)
   - Pricing Plan: Select appropriate plan (Pro recommended for production)
4. **Click "Create new project"**
5. **Wait for project to be created** (2-3 minutes)

### Step 2: Get Production Credentials

1. **Go to Project Settings → API**
2. **Copy the following:**
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - Format: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - Found under "Project API keys" → `anon` `public`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`
     - Found under "Project API keys" → `service_role` `secret`
     - ⚠️ **KEEP SECRET** - Never expose in client-side code

3. **Go to Project Settings → Database**
4. **Copy connection strings:**
   - **Connection pooling** (for regular queries) → `DATABASE_URL`
     - Format: `postgresql://postgres.[project-ref]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`
   - **Direct connection** (for migrations) → `DIRECT_URL`
     - Format: `postgresql://postgres.[project-ref]:[password]@aws-1-[region].pooler.supabase.com:5432/postgres`

### Step 3: Database Migration to Production

#### Option A: Using Prisma Migrate (Recommended)

```bash
# Navigate to storeflow directory
cd C:\xampp\htdocs\storeflow

# Set production database URL (use DIRECT_URL for migrations)
$env:DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-1-[region].pooler.supabase.com:5432/postgres"

# Run migrations
npm run db:migrate:deploy

# Generate Prisma Client
npm run db:generate
```

#### Option B: Using Supabase Migrations

```bash
# Link to production project
npx supabase link --project-ref your-project-ref

# Push all migrations
npx supabase db push
```

#### Verify Migrations

```bash
# Open Prisma Studio to verify tables
npm run db:studio
# Check that all tables exist:
# - tenants, price_plans, products, orders, customers, etc.
```

### Step 4: RLS Policies Verification

⚠️ **IMPORTANT:** Before verifying RLS, you must apply the RLS migration if it hasn't been applied yet.

**Apply RLS Migration:**

```bash
# Option 1: Using Supabase CLI
cd C:\xampp\htdocs\storeflow
npx supabase migration up

# Option 2: Using Supabase Dashboard
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Open: supabase/migrations/002_setup_rls_policies.sql
# 3. Copy and paste the entire SQL
# 4. Click "Run"
```

📄 **See:** [`APPLY_RLS_MIGRATION_GUIDE.md`](./APPLY_RLS_MIGRATION_GUIDE.md) for detailed instructions

**Verify RLS is Enabled:**

1. **Using the verification script (Recommended):**

```bash
npm run deploy:verify-rls
```

**Expected Output:**
```
✅ products                       RLS: Enabled  Policies: ✅ 1
✅ orders                         RLS: Enabled  Policies: ✅ 1
✅ customers                      RLS: Enabled  Policies: ✅ 1
...
```

2. **Or manually check in Supabase SQL Editor:**

```sql
-- Check RLS is enabled on all tenant-scoped tables
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'products', 'orders', 'customers', 'categories', 
    'pages', 'blogs', 'media_uploads', 'cart_items',
    'order_products', 'support_tickets', 'support_ticket_messages'
  )
ORDER BY tablename;

-- Verify RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'products';
```

3. **Test RLS policies:**

```sql
-- Create test tenant
INSERT INTO tenants (subdomain, name, status)
VALUES ('test-deployment', 'Test Deployment Store', 'active')
RETURNING id;

-- Set tenant context
SELECT set_tenant_context('test-deployment'::uuid);

-- Try to query products (should return empty or only this tenant's products)
SELECT * FROM products;
```

### Step 5: Storage Buckets Setup

1. **Go to Storage → Buckets in Supabase Dashboard**

2. **Create required buckets:**

   - **`product-images`** (Public)
     - Public: Yes
     - File size limit: 10 MB
     - Allowed MIME types: `image/*`
   
   - **`media-uploads`** (Public)
     - Public: Yes
     - File size limit: 50 MB
     - Allowed MIME types: `image/*`, `video/*`, `application/pdf`
   
   - **`documents`** (Private)
     - Public: No
     - File size limit: 10 MB
     - Allowed MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

3. **Configure bucket policies:**

```sql
-- Allow public read access to product-images
CREATE POLICY "Public Access for product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow authenticated uploads to product-images
CREATE POLICY "Authenticated Upload for product-images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);
```

### Step 6: Authentication Configuration

1. **Go to Authentication → Settings**

2. **Configure email settings:**
   - Enable email confirmations (recommended)
   - Set email template customization
   - Configure SMTP (optional - can use Supabase default)

3. **Set up redirect URLs:**
   - Add production URLs:
     - `https://www.dukanest.com/auth/callback`
     - `https://www.dukanest.com/auth/reset-password`
     - `https://*.dukanest.com/auth/callback`
     - `https://*.dukanest.com/auth/reset-password`

4. **Configure site URL:**
   - Site URL: `https://www.dukanest.com`

### Step 7: Environment Variables Documentation

Create a secure document with all production environment variables:

```env
# Supabase Production
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-1-[region].pooler.supabase.com:5432/postgres

# Vercel
VERCEL_URL=your-app.vercel.app
VERCEL_PROJECT_ID=your-project-id
VERCEL_TOKEN=your-vercel-token

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@dukanest.com
SENDGRID_FROM_NAME=StoreFlow

# Application
NEXT_PUBLIC_APP_URL=https://www.dukanest.com
MARKETING_DOMAIN=www.dukanest.com
NODE_ENV=production

# Cron Jobs
CRON_SECRET_TOKEN=your-secret-token

# Optional: Payment Gateways
PESAPAL_CONSUMER_KEY=your-key
PESAPAL_CONSUMER_SECRET=your-secret
PESAPAL_ENVIRONMENT=production
```

⚠️ **Security Notes:**
- Store this in a password manager (1Password, LastPass, etc.)
- Never commit to git
- Share only with authorized team members
- Rotate keys regularly

---

## Day 46 Afternoon: Vercel Production Deployment

### Step 1: Connect Repository to Vercel

1. **Go to Vercel Dashboard:** https://vercel.com/dashboard
2. **Click "Add New Project"**
3. **Import Git Repository:**
   - Select your GitHub/GitLab/Bitbucket repository
   - Choose branch: `main` (or `master`)
   - Click "Import"

### Step 2: Configure Project Settings

1. **Framework Preset:** Next.js (auto-detected)
2. **Root Directory:** `storeflow` (if monorepo) or `.` (if root)
3. **Build Command:** `npm run build` (default)
4. **Output Directory:** `.next` (default)
5. **Install Command:** `npm install` (default)
6. **Node.js Version:** 18.x or 20.x (check `package.json`)

### Step 3: Set Environment Variables

1. **Go to Project Settings → Environment Variables**

2. **Add all required variables:**

   **For Production:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `VERCEL_TOKEN`
   - `VERCEL_PROJECT_ID`
   - `SENDGRID_API_KEY`
   - `SENDGRID_FROM_EMAIL`
   - `SENDGRID_FROM_NAME`
   - `NEXT_PUBLIC_APP_URL`
   - `MARKETING_DOMAIN`
   - `NODE_ENV` = `production`
   - `CRON_SECRET_TOKEN`

   **For Preview (optional but recommended):**
   - Same variables but with preview/staging values

   **For Development (optional):**
   - Same variables but with local development values

3. **Click "Save"** after adding each variable

### Step 4: Deploy to Production

1. **Click "Deploy"**
2. **Wait for build to complete** (5-10 minutes)
3. **Monitor build logs:**
   - Check for TypeScript errors
   - Verify Prisma Client generation
   - Check for missing environment variables
   - Verify build succeeds

### Step 5: Build Verification

After deployment, verify:

1. **Check deployment URL:**
   - Visit: `https://your-app.vercel.app`
   - Should load homepage

2. **Check build logs:**
   - No errors or warnings
   - All environment variables loaded
   - Prisma Client generated successfully

3. **Verify API routes:**
   - Test: `https://your-app.vercel.app/api/health` (if exists)
   - Test: `https://your-app.vercel.app/api/tenant/current`

### Step 6: Initial Smoke Tests

Run basic smoke tests:

```bash
# Test homepage
curl https://your-app.vercel.app

# Test API health (if endpoint exists)
curl https://your-app.vercel.app/api/health

# Test tenant resolution
curl -H "Host: test.dukanest.com" https://your-app.vercel.app/api/tenant/current
```

**Checklist:**
- [ ] Homepage loads
- [ ] No console errors
- [ ] API routes respond
- [ ] Environment variables loaded correctly
- [ ] Database connection works
- [ ] Authentication redirects work

---

## Day 47 Morning: Production Domain Verification

### Step 1: Verify Domain Configuration

1. **Go to Vercel Project Settings → Domains**

2. **Verify domains are added:**
   - `www.dukanest.com` ✅ (Already configured in Day 13.5)
   - `dukanest.com` (apex domain) ✅ (Already configured in Day 13.5)
   - `*.dukanest.com` (wildcard) ✅ (Already configured in Day 13.5)

3. **Check domain status:**
   - All domains should show "Valid Configuration"
   - SSL certificates should be "Valid"

### Step 2: Verify DNS Configuration

1. **Check DNS records at Namecheap (or your DNS provider):**

   **Apex Domain (dukanest.com):**
   ```
   Type: A Record
   Host: @
   Value: 76.76.21.21 (Vercel's IP)
   TTL: Automatic
   ```

   **WWW Subdomain:**
   ```
   Type: CNAME Record
   Host: www
   Value: cname.vercel-dns.com
   TTL: Automatic
   ```

   **Wildcard Subdomain:**
   ```
   Type: CNAME Record
   Host: *
   Value: cname.vercel-dns.com
   TTL: Automatic
   ```

2. **Verify DNS propagation:**
   ```bash
   # Check DNS records
   nslookup dukanest.com
   nslookup www.dukanest.com
   nslookup test.dukanest.com
   ```

### Step 3: Test Production Subdomain Routing

1. **Create a test tenant** (if not already exists):
   - Use landlord admin dashboard
   - Create tenant with subdomain: `test-deployment`

2. **Test subdomain access:**
   - Visit: `https://test-deployment.dukanest.com`
   - Should load tenant storefront
   - Should not show 404 error

3. **Test tenant isolation:**
   - Create products for test tenant
   - Verify products only show for that tenant
   - Verify other tenants' data is not accessible

### Step 4: Verify SSL Certificates

1. **Check SSL for main domain:**
   - Visit: `https://www.dukanest.com`
   - Check browser shows valid SSL certificate
   - Certificate should be issued by Let's Encrypt or Vercel

2. **Check SSL for subdomains:**
   - Visit: `https://test-deployment.dukanest.com`
   - Verify SSL certificate is valid
   - Check certificate expiration (should auto-renew)

3. **Test HTTPS redirect:**
   - Visit: `http://www.dukanest.com` (HTTP)
   - Should redirect to `https://www.dukanest.com` (HTTPS)

4. **Verify SSL certificate details:**
   ```bash
   # Check SSL certificate
   openssl s_client -connect www.dukanest.com:443 -servername www.dukanest.com
   ```

---

## Day 47 Afternoon: Monitoring and Final Checks

### Step 1: Vercel Analytics Setup

1. **Enable Web Analytics:**
   - Go to Project Settings → Analytics
   - Enable "Web Analytics"
   - View metrics in dashboard

2. **Monitor:**
   - Page views
   - Performance metrics (LCP, FID, CLS)
   - Error rates
   - User behavior

3. **Enable Speed Insights:**
   - Already configured in code (see `@vercel/speed-insights` in package.json)
   - Verify it's working in production

### Step 2: Error Tracking Setup

#### Option A: Vercel Logs (Built-in)

1. **View logs:**
   - Go to Project → Deployments → Select deployment → Functions
   - View function logs
   - Check for errors

2. **Set up log monitoring:**
   - Use Vercel's built-in log viewer
   - Set up alerts for errors

#### Option B: Sentry (Recommended for Production)

1. **Install Sentry:**
   ```bash
   npm install @sentry/nextjs
   ```

2. **Configure Sentry:**
   ```typescript
   // sentry.client.config.ts
   import * as Sentry from "@sentry/nextjs";

   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 1.0,
   });
   ```

3. **Add environment variable:**
   - `NEXT_PUBLIC_SENTRY_DSN` = your Sentry DSN

4. **Set up alerts:**
   - Configure error alerts in Sentry dashboard
   - Set up email/Slack notifications

### Step 3: Performance Monitoring

1. **Vercel Analytics:**
   - Already enabled (see Step 1)
   - Monitor Core Web Vitals
   - Track page load times

2. **Database Performance:**
   - Go to Supabase Dashboard → Database → Performance
   - Monitor query performance
   - Check slow queries
   - Monitor connection pool usage

3. **API Performance:**
   - Monitor API response times in Vercel logs
   - Set up alerts for slow endpoints (> 2 seconds)
   - Track error rates

### Step 4: Uptime Monitoring

#### Option A: Vercel Uptime (Built-in)

1. **Check deployment status:**
   - Go to Vercel Dashboard
   - Monitor deployment health
   - Check for failed deployments

#### Option B: External Uptime Monitoring (Recommended)

1. **Set up UptimeRobot (Free):**
   - Go to https://uptimerobot.com
   - Create account
   - Add monitors:
     - `https://www.dukanest.com` (Main site)
     - `https://your-app.vercel.app` (API)
   - Set up alerts (email/SMS)

2. **Set up Pingdom (Paid):**
   - More advanced monitoring
   - Better alerting options
   - Performance monitoring included

3. **Monitor endpoints:**
   - Homepage: `https://www.dukanest.com`
   - API health: `https://your-app.vercel.app/api/health`
   - Tenant subdomain: `https://test-deployment.dukanest.com`

### Step 5: Error Alerting Configuration

1. **Vercel Alerts:**
   - Go to Project Settings → Notifications
   - Enable email notifications for:
     - Failed deployments
     - Build failures
     - Function errors

2. **Sentry Alerts (if using):**
   - Configure alert rules:
     - Error rate > 10 errors/minute
     - New error types
     - Performance degradation
   - Set up notification channels (email/Slack)

3. **Database Alerts (Supabase):**
   - Go to Supabase Dashboard → Settings → Alerts
   - Set up alerts for:
     - Database size limits
     - Connection pool exhaustion
     - Query performance issues

### Step 6: Final Production Checklist

**Pre-Launch Checklist:**

- [ ] All environment variables set in Vercel
- [ ] Database migrations completed
- [ ] RLS policies verified
- [ ] Storage buckets created
- [ ] SSL certificates valid for all domains
- [ ] DNS configuration correct
- [ ] Subdomain routing works
- [ ] Authentication works
- [ ] Email sending works (SendGrid)
- [ ] Cron jobs configured
- [ ] Monitoring set up
- [ ] Error tracking configured
- [ ] Uptime monitoring active
- [ ] Performance monitoring enabled
- [ ] Backup strategy in place
- [ ] Documentation updated

**Security Checklist:**

- [ ] All secrets in environment variables (not in code)
- [ ] API keys rotated for production
- [ ] CORS configured correctly
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] RLS policies tested
- [ ] Rate limiting enabled (if applicable)

**Performance Checklist:**

- [ ] Images optimized
- [ ] Code splitting implemented
- [ ] Caching configured
- [ ] Database indexes created
- [ ] CDN configured (Vercel handles this)
- [ ] Page load times < 3 seconds

---

## Troubleshooting

### Common Issues

#### Build Failures

**Issue:** Build fails on Vercel

**Solutions:**
- Check build logs for specific errors
- Verify all environment variables are set
- Ensure `package.json` has correct scripts
- Check Node.js version compatibility
- Verify Prisma Client generation succeeds

#### Database Connection Errors

**Issue:** Cannot connect to database

**Solutions:**
- Verify `DATABASE_URL` is correct
- Check database is accessible from Vercel
- Verify IP allowlist in Supabase (if enabled)
- Check connection pool limits
- Use connection pooling URL (port 6543)

#### Subdomain Not Working

**Issue:** Tenant subdomain doesn't load

**Solutions:**
- Verify DNS propagation (can take up to 48 hours)
- Check Vercel domain configuration
- Verify wildcard DNS record
- Check SSL certificate status
- Test with different subdomain

#### Email Not Sending

**Issue:** Emails not being sent

**Solutions:**
- Verify SendGrid API key
- Check SendGrid account status
- Verify sender email is verified
- Check email logs in SendGrid dashboard
- Test with SendGrid API directly

---

## Next Steps

After completing Day 46-47:

1. **Day 48-50:** Final Testing & Launch
   - Production smoke tests
   - Load testing
   - Security review
   - Backup strategy
   - Launch checklist
   - **🚀 Go Live!**

---

## Related Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Complete deployment reference
- [Vercel Domain Setup Guide](./VERCEL_DOMAIN_SETUP_GUIDE.md) - Domain configuration
- [Supabase Storage Setup](./SUPABASE_STORAGE_SETUP.md) - Storage configuration
- [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md) - Common issues and solutions
- [Pre-Deployment Checks](./PRE_DEPLOYMENT_CHECKS.md) - Pre-launch checklist

---

**Last Updated:** 2024  
**Version:** 1.0
