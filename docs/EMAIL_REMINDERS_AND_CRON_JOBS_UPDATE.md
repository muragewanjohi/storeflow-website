# Email Reminders & Cron Jobs Update

**Last Updated:** 2024

---

## Summary of Changes

This update addresses:
1. ✅ Kenya pricing detection for email reminders
2. ✅ Payment links pointing to tenant's store
3. ✅ Automatic cron job confirmation
4. ✅ Cron job monitoring dashboard

---

## 1. Kenya Pricing Detection

### How It Works

**Detection Method:**
- System checks `tenants.country` field in database
- If `country = 'KE'` or `'Kenya'` → Uses KES flat rates
- Otherwise → Uses USD prices

**Flat Rates for Kenya:**
- **Basic Plan:** KES 1,000 (not converted, fixed rate)
- **Pro/Standard Plan:** KES 3,000
- **Premium Plan:** KES 6,000

**Email Display:**
- Kenya tenants: `Ksh 1,000` (formatted with commas: `Ksh 1,000`)
- Other tenants: `$10.00`

### Setting Tenant Country

**Via Database:**
```sql
UPDATE tenants
SET country = 'KE'
WHERE id = 'tenant-id';
```

**Via Admin Dashboard:**
- Go to `/admin/tenants/[id]`
- Update tenant settings
- Set country field

---

## 2. Payment Links - Tenant Store

### Before
- Payment links pointed to: `{APP_URL}/dashboard/subscription`
- All tenants used the same URL

### After
- Payment links point to: `{tenant-store-url}/dashboard/subscription`
- Each tenant gets their own store URL

### URL Construction

1. **Custom Domain (Priority):**
   ```
   https://custom-domain.com/dashboard/subscription
   ```

2. **Subdomain (Fallback):**
   ```
   https://subdomain.dukanest.com/dashboard/subscription
   ```

3. **App URL (Final Fallback):**
   ```
   https://app-url.com/dashboard/subscription
   ```

**Implementation:**
- New helper: `getTenantPaymentUrl(tenant)` in `src/lib/subscriptions/tenant-url.ts`
- Updated email functions to use tenant store URL
- Payment button now says "Make Payment" and links to tenant's store

---

## 3. Automatic Cron Jobs

### Confirmation: YES, They Run Automatically!

**Schedule (from `vercel.json`):**

| Job | Schedule | Time (UTC) |
|-----|----------|------------|
| **Expiry Checker** | `0 0 * * *` | Daily at midnight |
| **Payment Reminders** | `0 9 * * *` | Daily at 9 AM |
| **Analytics Aggregate** | `0 1 * * *` | Daily at 1 AM |
| **Data Cleanup** | `0 2 * * 0` | Weekly (Sunday) at 2 AM |

**No manual intervention needed** - Vercel automatically runs these on schedule.

---

## 4. Cron Job Monitoring Dashboard

### New Features

**Location:** `/admin/cron-jobs`

**Features:**
1. **Statistics Dashboard:**
   - Total executions
   - Successful runs
   - Failed runs
   - Currently running jobs

2. **Job Status View:**
   - Last execution time
   - Execution duration
   - Success/failure status
   - Error messages

3. **Execution Logs:**
   - Last 50 cron job executions
   - Filter by job name
   - Detailed execution information

4. **Manual Trigger:**
   - "Restart" button for each job
   - Real-time execution status
   - Immediate results

### Database Schema

**New Table:** `cron_job_logs`

```sql
CREATE TABLE cron_job_logs (
  id UUID PRIMARY KEY,
  job_name VARCHAR(255),
  job_path VARCHAR(500),
  status VARCHAR(50), -- running, success, failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  result JSONB,
  error TEXT,
  metadata JSONB
);
```

### API Endpoints

**GET /api/admin/cron-jobs**
- Get cron job logs and statistics
- Requires landlord authentication

**POST /api/admin/cron-jobs**
- Manually trigger a cron job
- Requires landlord authentication

---

## Files Changed

### New Files
1. `src/lib/subscriptions/tenant-url.ts` - Tenant URL helper
2. `src/lib/cron-jobs/logger.ts` - Cron job logging utilities
3. `src/app/api/admin/cron-jobs/route.ts` - Cron job monitoring API
4. `src/app/admin/cron-jobs/page.tsx` - Cron jobs dashboard page
5. `src/app/admin/cron-jobs/cron-jobs-client.tsx` - Dashboard client component
6. `docs/CRON_JOBS_MONITORING.md` - Cron jobs documentation
7. `docs/EMAIL_REMINDERS_AND_CRON_JOBS_UPDATE.md` - This file

### Modified Files
1. `src/lib/subscriptions/emails.ts` - Added Kenya pricing and tenant store URLs
2. `src/app/api/admin/subscriptions/payment-reminders/route.ts` - Added Kenya detection and logging
3. `src/app/api/admin/subscriptions/expiry-checker/route.ts` - Added logging
4. `src/components/admin/sidebar.tsx` - Added "Cron Jobs" navigation link
5. `prisma/schema.prisma` - Added `cron_job_logs` model

---

## Database Migration Required

After updating the Prisma schema, run:

```bash
npx prisma migrate dev --name add_cron_job_logs
```

Or if using Supabase directly:

```sql
CREATE TABLE cron_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(255) NOT NULL,
  job_path VARCHAR(500) NOT NULL,
  status VARCHAR(50) DEFAULT 'running',
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  result JSONB DEFAULT '{}',
  error TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_cron_job_logs_job_name ON cron_job_logs(job_name);
CREATE INDEX idx_cron_job_logs_status ON cron_job_logs(status);
CREATE INDEX idx_cron_job_logs_started_at ON cron_job_logs(started_at);
```

---

## Testing

### Test Kenya Pricing

1. **Set tenant country to Kenya:**
   ```sql
   UPDATE tenants SET country = 'KE' WHERE id = 'test-tenant-id';
   ```

2. **Trigger payment reminders:**
   - Go to `/admin/tenants/[id]`
   - Click "Trigger Payment Reminders"
   - Check email - should show KES prices

### Test Payment Links

1. **Check tenant has subdomain/custom domain:**
   ```sql
   SELECT subdomain, custom_domain FROM tenants WHERE id = 'test-tenant-id';
   ```

2. **Send test email:**
   - Use manual trigger or wait for cron
   - Check email - "Make Payment" button should link to tenant's store

### Test Cron Job Monitoring

1. **Access dashboard:**
   - Go to `/admin/cron-jobs`
   - Should see statistics and job list

2. **Trigger a job:**
   - Click "Restart" on any job
   - Should see execution in logs
   - Status should update

---

## Quick Answers

### Q: How do we track if the user is from Kenya?

**A:** System checks `tenants.country` field:
- If `country = 'KE'` or `'Kenya'` → Uses KES flat rates
- Set via database: `UPDATE tenants SET country = 'KE' WHERE id = '...'`

### Q: Does the "Make Payment" button lead to the tenant's store?

**A:** Yes! Payment links now point to:
- `{tenant-subdomain}.dukanest.com/dashboard/subscription` OR
- `{custom-domain}/dashboard/subscription`

### Q: Are there automatic cron jobs running daily?

**A:** Yes! Configured in `vercel.json`:
- **Payment Reminders:** Daily at 9 AM UTC
- **Expiry Checker:** Daily at midnight UTC
- **Analytics:** Daily at 1 AM UTC
- **Cleanup:** Weekly on Sunday at 2 AM UTC

### Q: Where can I see cron job status and restart them?

**A:** Go to `/admin/cron-jobs`:
- View execution statistics
- See last run time and status
- View execution logs
- Click "Restart" to manually trigger any job

---

**Last Updated:** 2024
