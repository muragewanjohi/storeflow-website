# Email Reminders & Cron Jobs FAQ

**Last Updated:** 2024

---

## Q1: How do we track if the user is from Kenya so that we send the flat rates for pricing?

### Answer

**Detection Method:**
The system checks the `tenants.country` field in the database:

```sql
SELECT country FROM tenants WHERE id = 'tenant-id';
```

**Logic:**
- If `country = 'KE'` or `country = 'Kenya'` → Uses **KES flat rates**
- Otherwise → Uses **USD prices**

**Flat Rates for Kenya (Fixed, Not Converted):**
- **Basic Plan:** KES 1,000
- **Pro/Standard Plan:** KES 3,000
- **Premium Plan:** KES 6,000

**Email Display:**
- Kenya tenants see: `Ksh 1,000` (formatted: `Ksh 1,000`)
- Other tenants see: `$10.00`

### How to Set Tenant Country

**Via Database:**
```sql
UPDATE tenants
SET country = 'KE'
WHERE id = 'tenant-id';
```

**Via Admin Dashboard:**
1. Go to `/admin/tenants/[id]`
2. Update tenant settings
3. Set country field to "Kenya" or "KE"

---

## Q2: Does the "Make Payment" button lead to the tenant's store?

### Answer

**YES!** Payment links now point to the tenant's own store.

**URL Structure:**
- **Custom Domain:** `https://custom-domain.com/dashboard/subscription`
- **Subdomain:** `https://subdomain.dukanest.com/dashboard/subscription`
- **Fallback:** `https://app-url.com/dashboard/subscription`

**Before:** All payment links went to the main app URL  
**After:** Each tenant gets their own store URL for payments

**Implementation:**
- New helper function: `getTenantPaymentUrl(tenant)`
- Checks `tenant.custom_domain` first, then `tenant.subdomain`
- Payment button in emails now says "Make Payment" and links to tenant's store

---

## Q3: Are there automatic cron jobs running once every day?

### Answer

**YES!** Cron jobs run automatically on Vercel.

**Schedule (from `vercel.json`):**

| Job | Schedule | Time (UTC) | Description |
|-----|----------|------------|-------------|
| **Payment Reminders** | `0 9 * * *` | Daily at 9 AM | Sends renewal and payment due reminder emails |
| **Expiry Checker** | `0 0 * * *` | Daily at midnight | Checks for expired subscriptions |
| **Analytics Aggregate** | `0 1 * * *` | Daily at 1 AM | Pre-computes analytics data |
| **Data Cleanup** | `0 2 * * 0` | Weekly (Sunday) at 2 AM | Cleans up old data |

**No manual intervention needed** - Vercel automatically executes these on schedule.

**Verification:**
- Check Vercel Dashboard → Deployments → Cron Jobs
- Or use the new Cron Jobs Monitoring Dashboard at `/admin/cron-jobs`

---

## Q4: Where can I see cron jobs that have run, those that have failed, and restart them?

### Answer

**New Feature: Cron Jobs Monitoring Dashboard**

**Location:** `/admin/cron-jobs`

**Features:**

1. **Statistics Dashboard:**
   - Total executions
   - Successful runs
   - Failed runs
   - Currently running jobs

2. **Job Status View:**
   - Last execution time for each job
   - Execution duration
   - Success/failure status
   - Error messages (if failed)

3. **Execution Logs:**
   - Last 50 cron job executions
   - Filter by job name
   - Detailed execution information

4. **Manual Trigger/Restart:**
   - "Restart" button for each configured job
   - Real-time execution status
   - Immediate results display

**Navigation:**
- Go to Admin Dashboard
- Click "Cron Jobs" in the sidebar
- View all job statuses and logs

**Access:**
- Requires landlord role
- Available at `/admin/cron-jobs`

---

## Summary

| Question | Answer |
|----------|--------|
| **Kenya pricing detection?** | ✅ Checks `tenants.country` field (KE/Kenya = KES flat rates) |
| **Payment links to tenant store?** | ✅ Yes - Links to `{subdomain/custom-domain}/dashboard/subscription` |
| **Automatic cron jobs?** | ✅ Yes - Run daily/weekly automatically on Vercel |
| **Cron job monitoring?** | ✅ Yes - Dashboard at `/admin/cron-jobs` with logs, status, and restart |

---

## Quick Reference

### Set Tenant Country (Kenya)
```sql
UPDATE tenants SET country = 'KE' WHERE id = 'tenant-id';
```

### View Cron Jobs
- Dashboard: `/admin/cron-jobs`
- API: `GET /api/admin/cron-jobs`

### Restart Cron Job
- Dashboard: Click "Restart" button
- API: `POST /api/admin/cron-jobs` with `{"jobPath": "/api/admin/subscriptions/payment-reminders"}`

### Check Automatic Schedule
- See `vercel.json` for cron job schedules
- Or check Vercel Dashboard → Cron Jobs

---

**Last Updated:** 2024
