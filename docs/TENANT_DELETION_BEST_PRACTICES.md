# Tenant Deletion Best Practices

**Last Updated:** 2024

---

## Overview

This document outlines best practices for handling tenant deletion in StoreFlow, including soft deletion, retention periods, and hard deletion strategies.

---

## Current Implementation

### Soft Deletion

When a tenant is deleted via the admin dashboard:

1. **Status Update:** Tenant `status` is set to `'deleted'`
2. **Subdomain Removal:** Subdomain is removed from Vercel (non-blocking)
3. **Data Preservation:** Tenant record remains in database with all data intact
4. **Deletion Timestamp:** `deleted_at` timestamp is stored in `data.deleted_at` JSON field
5. **Access Suspension:** Tenant can no longer access their storefront or dashboard

### Benefits of Soft Deletion

- **Data Recovery:** Ability to restore accidentally deleted tenants
- **Audit Trail:** Maintains historical records for compliance
- **Analytics:** Preserves data for reporting and analysis
- **Legal Compliance:** Meets data retention requirements
- **Grace Period:** Allows time for dispute resolution

---

## Best Practices for Hard Deletion

### Recommended Retention Period

**Standard Retention: 90 days**

This period balances:
- **GDPR Compliance:** 30-day minimum retention for data recovery
- **Business Needs:** Time for account restoration requests
- **Legal Requirements:** Compliance with data protection regulations
- **Storage Costs:** Reasonable balance between retention and cleanup

### Retention Period Guidelines

| Scenario | Recommended Retention | Rationale |
|----------|----------------------|-----------|
| **Standard Deletion** | 90 days | Balance between recovery needs and storage |
| **GDPR Compliance** | 30 days minimum | Minimum required for data recovery requests |
| **Legal/Compliance** | 1-7 years | Depends on jurisdiction and industry |
| **Payment/Financial Data** | 7 years | Common requirement for financial records |
| **User Request** | Immediate | If user explicitly requests permanent deletion |

---

## Implementation Strategy

### Option 1: Scheduled Cleanup Job (Implemented ✅)

A cron job runs weekly to hard delete tenants past the retention period:

**Endpoint:** `/api/admin/cleanup/hard-delete-tenants`

**Implementation:** `storeflow/src/app/api/admin/cleanup/hard-delete-tenants/route.ts`

**What it does:**
1. Finds tenants with `status='deleted'` and `deleted_at` older than retention period
2. Removes subdomain and custom domain from Vercel
3. Hard deletes tenant record and related data
4. Logs all operations for monitoring

**Schedule:** Weekly on Sunday at 3 AM UTC (`0 3 * * 0`)

**Configuration:**
- Retention period: `TENANT_RETENTION_DAYS` environment variable (default: 90 days)
- Protected by `CRON_SECRET_TOKEN` or Vercel Cron header

### Option 2: Manual Hard Delete

Provide an admin action to manually hard delete tenants:

```typescript
// POST /api/admin/tenants/[id]/hard-delete
export async function POST(request: NextRequest) {
  // Require explicit confirmation
  // Hard delete tenant and all related data
  // Log deletion for audit trail
}
```

---

## What to Delete During Hard Deletion

### Must Delete

1. **Tenant Record:** Main tenant entry in `tenants` table
2. **User Accounts:** All users associated with the tenant
3. **Subdomain:** Ensure subdomain is removed from Vercel
4. **Custom Domain:** Remove custom domain from Vercel
5. **Storage Files:** Delete all uploaded files/media
6. **Payment Data:** Anonymize or delete payment records (check compliance)

### Consider Keeping (Anonymized)

1. **Analytics Data:** Aggregate data for platform analytics
2. **Order History:** May need to keep for financial/legal compliance
3. **Audit Logs:** Keep for security and compliance purposes

### Database Cleanup Order

```sql
-- 1. Delete tenant-scoped data (products, orders, customers, etc.)
-- 2. Delete tenant users
-- 3. Delete tenant record
-- 4. Clean up orphaned records
```

---

## Environment Variables

Add to `.env.local` and Vercel:

```env
# Tenant Deletion Settings
# Retention period in days (default: 90)
# Tenants soft-deleted longer than this will be hard deleted by cleanup job
TENANT_RETENTION_DAYS=90

# Note: ENABLE_AUTO_HARD_DELETE is not needed - the cleanup job runs automatically
# if TENANT_RETENTION_DAYS is set and the cron job is configured in vercel.json
```

---

## Database Schema Enhancement (Completed ✅)

The `deleted_at` column has been added to the tenants table:

**Migration:** `supabase/migrations/011_add_deleted_at_to_tenants.sql`

```sql
ALTER TABLE tenants 
ADD COLUMN deleted_at TIMESTAMP NULL;

CREATE INDEX idx_tenants_deleted_at ON tenants(deleted_at) 
WHERE deleted_at IS NOT NULL;
```

**Benefits:**
- ✅ More efficient queries for cleanup jobs
- ✅ Better indexing for retention period queries
- ✅ Clearer data model
- ✅ Direct timestamp tracking (no JSON parsing needed)

---

## Compliance Considerations

### GDPR (EU)

- **Right to Erasure:** Users can request immediate deletion
- **Retention Period:** Minimum 30 days for recovery
- **Data Minimization:** Delete data that's no longer necessary

### CCPA (California)

- **Consumer Rights:** Users can request deletion
- **Business Records:** May need to keep some data for legal compliance

### Industry-Specific

- **Healthcare (HIPAA):** 6 years minimum retention
- **Financial (SOX):** 7 years minimum retention
- **E-commerce:** Varies by jurisdiction

---

## Monitoring & Alerts

### Metrics to Track

1. **Soft Deleted Tenants:** Count of tenants in retention period
2. **Hard Deletion Rate:** Number of tenants hard deleted per week
3. **Restoration Requests:** Track how often tenants are restored
4. **Storage Usage:** Monitor storage impact of soft-deleted tenants

### Alerts

- **High Deletion Rate:** Alert if deletion rate spikes
- **Retention Period Expiring:** Notify before hard deletion
- **Restoration Requests:** Track restoration patterns

---

## Restoration Process

### Manual Restoration

1. Admin changes tenant `status` from `'deleted'` to `'active'`
2. Re-add subdomain to Vercel if needed
3. Restore access to tenant users
4. Clear `deleted_at` timestamp from data JSON

### Automatic Restoration (Optional)

Consider allowing tenants to request restoration within retention period:
- Self-service restoration request form
- Automatic approval if within grace period
- Manual review for extended periods

---

## Recommended Implementation Timeline

### Phase 1: Current (Soft Delete Only)
- ✅ Soft delete with status update
- ✅ Store `deleted_at` in data JSON
- ✅ Remove subdomain from Vercel
- ✅ Filter deleted tenants in admin UI

### Phase 2: Retention Tracking (Completed ✅)
- [x] Add `deleted_at` column to database ✅
- [x] Create cleanup cron job ✅
- [x] Add retention period configuration ✅
- [x] Implement hard deletion logic ✅

### Phase 3: Compliance & Monitoring (Future)
- [ ] Add restoration request system
- [ ] Implement audit logging
- [ ] Add monitoring and alerts
- [ ] Create compliance reports

---

## Summary

| Aspect | Recommendation |
|--------|----------------|
| **Soft Delete** | ✅ Implemented - Sets status to 'deleted' |
| **Retention Period** | 90 days (configurable) |
| **Hard Delete** | Automated cleanup job after retention period |
| **Restoration** | Manual admin action within retention period |
| **Compliance** | Follow GDPR/CCPA requirements based on jurisdiction |
| **Monitoring** | Track deletion rates and storage usage |

---

## Related Documentation

- [Cron Jobs Monitoring](./CRON_JOBS_MONITORING.md)
- [Database Architecture](../docs/DATABASE_ARCHITECTURE_OPTIONS.md)
- [Vercel Domain Setup](./VERCEL_DOMAIN_SETUP_GUIDE.md)

---

**Last Updated:** 2024

