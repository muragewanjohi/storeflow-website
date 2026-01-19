# Maintenance and Updates Guide

## Overview

This guide outlines best practices for maintaining and updating StoreFlow on Vercel, following industry standards used by companies like Vercel, Shopify, and other modern SaaS platforms.

---

## Table of Contents

1. [Deployment Strategy](#deployment-strategy)
2. [Database Migrations](#database-migrations)
3. [Zero-Downtime Deployments](#zero-downtime-deployments)
4. [Rollback Procedures](#rollback-procedures)
5. [Testing Strategy](#testing-strategy)
6. [Monitoring & Logging](#monitoring--logging)
7. [Backup Strategy](#backup-strategy)
8. [Version Management](#version-management)
9. [Feature Flags](#feature-flags)
10. [Scheduled Maintenance](#scheduled-maintenance)

---

## Deployment Strategy

### Branch-Based Workflow (Recommended)

Vercel automatically creates preview deployments for every branch push. Use this workflow:

```
main (production) → Production deployment
├── dev (development) → Preview deployment
├── staging → Preview deployment
└── feature/* → Preview deployments
```

### Environment Setup

1. **Production Environment**
   - Branch: `main`
   - Domain: `dukanest.com` (or your production domain)
   - Database: Production Supabase instance
   - Environment Variables: Set in Vercel dashboard → Settings → Environment Variables → Production

2. **Preview Environment**
   - Branch: `dev` (or any branch)
   - Domain: Auto-generated preview URLs (`*.vercel.app`)
   - Database: Can use production (with RLS) or staging database
   - Environment Variables: Set for "Preview" environment in Vercel

3. **Development Environment**
   - Local: `npm run dev`
   - Database: Local Supabase or production (with RLS)
   - Environment Variables: `.env.local`

### Deployment Process

#### Standard Deployment Flow

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push to GitHub (creates preview deployment)
git push origin feature/new-feature

# 4. Test on preview URL (Vercel provides link)

# 5. Merge to dev branch for staging
git checkout dev
git merge feature/new-feature
git push origin dev

# 6. After testing, merge to main for production
git checkout main
git merge dev
git push origin main  # Triggers production deployment
```

#### Automated Deployments

Vercel automatically:
- ✅ Builds on every push
- ✅ Creates preview deployments for branches
- ✅ Deploys to production on `main` branch push
- ✅ Runs `prebuild` script (Prisma generate + type-check)
- ✅ Shows build logs and deployment status

---

## Database Migrations

### Migration Strategy

**Critical Rule:** Always test migrations on preview/staging before production!

### Development Workflow

```bash
# 1. Make schema changes in prisma/schema.prisma

# 2. Create migration
npm run db:migrate -- --name descriptive_name

# 3. Test locally
npm run dev

# 4. Commit migration files
git add prisma/migrations/
git commit -m "migration: add new table"
```

### Production Migration Workflow

#### Option 1: Automated (Recommended for Vercel)

Create a migration API endpoint that runs on deployment:

```typescript
// src/app/api/migrations/run/route.ts
// This runs automatically via Vercel's post-deploy hook
```

**Setup in Vercel:**
1. Go to Project Settings → Git
2. Add Build Command: `npm run build`
3. Add Output Directory: `.next`
4. Add Install Command: `npm install`

**Add Post-Deploy Hook:**
- Create a Vercel Function that runs migrations
- Or use Vercel's `vercel.json` build hooks

#### Option 2: Manual (Safer for Critical Migrations)

```bash
# 1. Deploy code first (without migration)
git push origin main

# 2. Wait for deployment to complete

# 3. Run migration manually via Supabase SQL Editor
# OR use Prisma migrate deploy:
npm run db:migrate:deploy
```

### Migration Best Practices

1. **Backward Compatible Migrations**
   - Add columns as nullable first
   - Migrate data in separate step
   - Make required later

2. **Large Migrations**
   - Break into smaller steps
   - Use `--create-only` flag to review SQL first
   - Test on staging database copy

3. **Rollback Plan**
   - Always have rollback SQL ready
   - Test rollback on staging first
   - Document rollback steps

### Example: Safe Migration Pattern

```sql
-- Step 1: Add column as nullable
ALTER TABLE orders ADD COLUMN new_field VARCHAR(255) NULL;

-- Step 2: Backfill data (run separately)
UPDATE orders SET new_field = 'default' WHERE new_field IS NULL;

-- Step 3: Make required (run after verification)
ALTER TABLE orders ALTER COLUMN new_field SET NOT NULL;
```

---

## Zero-Downtime Deployments

### Vercel's Built-in Zero-Downtime

Vercel provides zero-downtime deployments by default:
- ✅ Atomic deployments (switches traffic instantly)
- ✅ Automatic rollback on build failure
- ✅ Health checks before traffic switch
- ✅ Gradual traffic rollout (Pro plan)

### Best Practices

1. **Database Migrations**
   - Run migrations BEFORE code deployment
   - Or make migrations backward compatible
   - Use feature flags for breaking changes

2. **API Routes**
   - Keep old endpoints working during transition
   - Use versioning: `/api/v1/`, `/api/v2/`
   - Deprecate old versions gradually

3. **Environment Variables**
   - Update in Vercel dashboard BEFORE deployment
   - Use Vercel's environment variable preview
   - Test variable changes on preview first

### Deployment Checklist

Before deploying to production:

- [ ] All tests pass (`npm run test:all`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Preview deployment tested
- [ ] Database migrations tested on staging
- [ ] Environment variables updated
- [ ] Rollback plan documented
- [ ] Team notified (for major changes)

---

## Rollback Procedures

### Vercel Rollback Options

#### Option 1: Instant Rollback (Recommended)

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"
4. Done! (Takes ~30 seconds)

#### Option 2: Git-Based Rollback

```bash
# 1. Revert commit
git revert <commit-hash>

# 2. Push to main
git push origin main

# 3. Vercel automatically redeploys
```

#### Option 3: Database Rollback

```bash
# 1. Rollback Prisma migration
npx prisma migrate resolve --rolled-back <migration-name>

# 2. Run rollback SQL manually in Supabase
# (Have rollback SQL ready before migration)
```

### Rollback Decision Tree

```
Deployment Issue?
├── Code Issue → Use Vercel "Promote to Production"
├── Database Issue → Run rollback SQL + code rollback
├── Environment Variable Issue → Update vars + redeploy
└── Both Code + DB → Rollback code first, then DB
```

---

## Testing Strategy

### Pre-Deployment Testing

#### 1. Local Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Unit tests
npm run test

# E2E tests
npm run test:e2e:chromium

# Full verification
npm run verify
```

#### 2. Preview Deployment Testing

- Vercel automatically creates preview URLs
- Test critical user flows on preview
- Check environment variables are loaded
- Verify database connections

#### 3. Staging Testing

- Use `dev` branch for staging
- Test with production-like data
- Run smoke tests: `npm run deploy:smoke-tests`

### Automated Testing (CI/CD)

**Recommended: GitHub Actions**

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

### Testing Checklist

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (critical flows)
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Preview deployment works
- [ ] Database migrations tested

---

## Monitoring & Logging

### Vercel Monitoring

#### 1. Function Logs

- **Location:** Vercel Dashboard → Project → Functions
- **Access:** Real-time logs for API routes
- **Use Cases:** Debug API errors, monitor performance

#### 2. Analytics

- **Location:** Vercel Dashboard → Analytics
- **Metrics:** Page views, performance, Web Vitals
- **Setup:** Automatic with Vercel deployment

#### 3. Real-Time Logs

- **Location:** Vercel Dashboard → Logs
- **Access:** Stream logs in real-time
- **Filter:** By function, status, time range

### Application Monitoring

#### Recommended Tools

1. **Sentry** (Error Tracking)
   ```bash
   npm install @sentry/nextjs
   ```
   - Tracks errors and exceptions
   - Provides stack traces
   - Alerts on critical errors

2. **Vercel Analytics** (Built-in)
   - Web Vitals monitoring
   - Performance metrics
   - User analytics

3. **Custom Logging**
   ```typescript
   // Use console.log for development
   // Use structured logging for production
   console.log('[API]', { endpoint, status, duration });
   ```

### Health Checks

Create health check endpoint:

```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message },
      { status: 503 }
    );
  }
}
```

**Setup Vercel Health Check:**
- Add to `vercel.json`:
```json
{
  "healthCheck": {
    "path": "/api/health",
    "interval": 60
  }
}
```

---

## Backup Strategy

### Database Backups

#### Supabase Automatic Backups

Supabase provides:
- ✅ Daily automated backups (retained for 7 days)
- ✅ Point-in-time recovery (PITR) on Pro plan
- ✅ Manual backup creation

#### Manual Backup Process

1. **Via Supabase Dashboard**
   - Go to Database → Backups
   - Click "Create Backup"
   - Download backup file

2. **Via Supabase CLI**
   ```bash
   # Dump database
   supabase db dump -f backup_$(date +%Y%m%d).sql
   ```

3. **Via pg_dump**
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   ```

### Backup Schedule

- **Daily:** Automated (Supabase)
- **Before Major Changes:** Manual backup
- **Weekly:** Download and store off-site
- **Monthly:** Full backup archive

### Backup Storage

Store backups in:
- Supabase (automatic)
- AWS S3 / Google Cloud Storage (for long-term)
- Local storage (for quick access)

### Restore Procedure

```bash
# 1. Download backup from Supabase

# 2. Restore to staging first
psql $STAGING_DATABASE_URL < backup.sql

# 3. Test restore

# 4. Restore to production if needed
psql $PRODUCTION_DATABASE_URL < backup.sql
```

---

## Version Management

### Semantic Versioning

Follow [SemVer](https://semver.org/):

```
MAJOR.MINOR.PATCH
1.0.0 → 1.0.1 (patch - bug fixes)
1.0.1 → 1.1.0 (minor - new features)
1.1.0 → 2.0.0 (major - breaking changes)
```

### Version Tracking

1. **package.json**
   ```json
   {
     "version": "1.0.0"
   }
   ```

2. **Git Tags**
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

3. **Changelog**
   - Maintain `CHANGELOG.md`
   - Document breaking changes
   - List new features and fixes

### Release Process

```bash
# 1. Update version
npm version patch  # or minor, major

# 2. Update CHANGELOG.md

# 3. Commit and tag
git add .
git commit -m "chore: release v1.0.1"
git tag v1.0.1
git push origin main --tags

# 4. Deploy (Vercel auto-deploys on push)
```

---

## Feature Flags

### Implementation Strategy

Use feature flags for gradual rollouts and safe deployments:

```typescript
// src/lib/feature-flags.ts
export function isFeatureEnabled(feature: string, tenantId?: string): boolean {
  // Check environment variable
  const envFlag = process.env[`FEATURE_${feature.toUpperCase()}`];
  if (envFlag === 'true') return true;
  if (envFlag === 'false') return false;
  
  // Check tenant-specific flags (from database)
  // Check percentage rollout
  // etc.
  
  return false;
}
```

### Usage Example

```typescript
// In your component
if (isFeatureEnabled('NEW_CHECKOUT', tenant.id)) {
  return <NewCheckoutComponent />;
}
return <OldCheckoutComponent />;
```

### Vercel Environment Variables

Set feature flags as environment variables:
- `FEATURE_NEW_CHECKOUT=true` (enable for all)
- `FEATURE_NEW_CHECKOUT=false` (disable for all)
- Or use Vercel's Edge Config for dynamic flags

---

## Scheduled Maintenance

### Vercel Cron Jobs

Already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/admin/subscriptions/expiry-checker",
      "schedule": "0 0 * * *"  // Daily at midnight
    }
  ]
}
```

### Maintenance Windows

1. **Schedule Maintenance**
   - Use low-traffic hours
   - Notify users in advance
   - Use Vercel's maintenance mode (if available)

2. **Database Maintenance**
   - Run `VACUUM` and `ANALYZE` weekly
   - Check index usage
   - Monitor table sizes

3. **Cleanup Tasks**
   - Old logs
   - Expired sessions
   - Unused files

---

## Emergency Procedures

### Production Incident Response

1. **Identify Issue**
   - Check Vercel logs
   - Check Supabase logs
   - Check Sentry (if configured)

2. **Assess Impact**
   - How many users affected?
   - Is it critical?
   - Can it wait?

3. **Take Action**
   - Rollback if needed (Vercel dashboard)
   - Fix and redeploy
   - Communicate with users

4. **Post-Mortem**
   - Document what happened
   - Identify root cause
   - Prevent future occurrences

### Emergency Contacts

- **Vercel Support:** [support.vercel.com](https://vercel.com/support)
- **Supabase Support:** [supabase.com/support](https://supabase.com/support)
- **Database Access:** Supabase Dashboard → SQL Editor

---

## Best Practices Summary

### ✅ DO

- ✅ Test on preview before production
- ✅ Run migrations on staging first
- ✅ Use feature flags for risky changes
- ✅ Keep backups before major changes
- ✅ Monitor logs and errors
- ✅ Use semantic versioning
- ✅ Document breaking changes
- ✅ Have rollback plan ready

### ❌ DON'T

- ❌ Deploy directly to main without testing
- ❌ Run untested migrations on production
- ❌ Skip type checking and linting
- ❌ Ignore build warnings
- ❌ Deploy on Fridays (if you can't fix issues)
- ❌ Make breaking changes without notice
- ❌ Skip backups before major changes
- ❌ Deploy without reviewing changes

---

## Recommended Tools

1. **Vercel Dashboard** - Deployment management
2. **Supabase Dashboard** - Database management
3. **GitHub** - Version control and CI/CD
4. **Sentry** - Error tracking (optional)
5. **Vercel Analytics** - Performance monitoring
6. **Postman** - API testing
7. **Playwright** - E2E testing

---

## Quick Reference

### Common Commands

```bash
# Deploy to production
git push origin main

# Rollback deployment
# → Vercel Dashboard → Promote previous deployment

# Run database migration
npm run db:migrate:deploy

# Check deployment status
# → Vercel Dashboard → Deployments

# View logs
# → Vercel Dashboard → Functions → Logs

# Create backup
# → Supabase Dashboard → Database → Backups
```

### Emergency Rollback

1. Vercel Dashboard → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"
4. Done in ~30 seconds

---

## Additional Resources

- [Vercel Deployment Documentation](https://vercel.com/docs/deployments)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Prisma Migrations Guide](https://www.prisma.io/docs/guides/migrate)
- [Supabase Backups](https://supabase.com/docs/guides/platform/backups)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Last Updated:** January 2025
**Maintained By:** StoreFlow Team
