# Tenant Not Found Error - Troubleshooting Guide

## Problem

You're seeing errors like:
```
Tenant not found: {
  hostname: 'matunda.dukanest.com',
  subdomain: 'matunda',
  error: 'No tenant found'
}
```

## Common Causes

1. **Tenant Status is Not 'active'**
   - The tenant exists but has status `expired`, `suspended`, or `deleted`
   - Only tenants with status `active` are accessible

2. **Subdomain Mismatch**
   - The subdomain in the database doesn't match exactly (case sensitivity, typos)
   - Subdomains are stored in lowercase

3. **Cache Issue**
   - Stale cache showing tenant as not found
   - Cache might have old tenant data

4. **Tenant Doesn't Exist**
   - The tenant was never created or was deleted

## Diagnostic Steps

### Step 1: Check Tenant Status

Use the diagnostic API endpoint (requires landlord authentication):

```bash
GET /api/admin/tenants/diagnose?subdomain=matunda
```

This will show:
- If tenant exists in database
- Current status
- Subdomain match
- Similar subdomains found

### Step 2: Check Database Directly

Query the database to verify tenant:

```sql
SELECT id, name, subdomain, status, custom_domain, created_at
FROM tenants
WHERE subdomain = 'matunda';
```

Or check all tenants with similar subdomains:

```sql
SELECT id, name, subdomain, status
FROM tenants
WHERE subdomain ILIKE '%matunda%';
```

### Step 3: Clear Cache

If tenant exists but still not resolving, clear the cache:

```bash
POST /api/admin/tenants/clear-cache
Content-Type: application/json

{
  "subdomain": "matunda"
}
```

Or clear all caches:

```bash
POST /api/admin/tenants/clear-cache
Content-Type: application/json

{}
```

## Solutions

### Solution 1: Activate Tenant

If tenant exists but status is not 'active':

```sql
UPDATE tenants
SET status = 'active'
WHERE subdomain = 'matunda';
```

Then clear the cache and try again.

### Solution 2: Fix Subdomain

If subdomain doesn't match exactly:

1. Check the exact subdomain in database:
   ```sql
   SELECT subdomain FROM tenants WHERE id = '<tenant-id>';
   ```

2. Update if needed:
   ```sql
   UPDATE tenants
   SET subdomain = 'matunda'
   WHERE id = '<tenant-id>';
   ```

3. Clear cache and verify

### Solution 3: Create Missing Tenant

If tenant doesn't exist, create it:

1. Go to Admin Dashboard → Tenants → New Tenant
2. Or use the API:
   ```bash
   POST /api/admin/tenants
   ```

### Solution 4: Check Environment Variables

Ensure these are set correctly:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

## Prevention

1. **Always set tenant status to 'active'** when creating/updating tenants
2. **Use lowercase subdomains** consistently
3. **Clear cache after tenant updates** to avoid stale data
4. **Monitor tenant status** regularly to catch expired/suspended tenants

## Enhanced Error Logging

The system now logs enhanced diagnostic information when a tenant is not found:

- Checks if tenant exists with different status
- Shows current status if found
- Suggests similar subdomains
- Provides actionable recommendations

Check Vercel logs for detailed diagnostic information.

## Quick Fix Script

For immediate resolution, run this in your database:

```sql
-- Check tenant
SELECT * FROM tenants WHERE subdomain = 'matunda';

-- If found but not active, activate it
UPDATE tenants 
SET status = 'active' 
WHERE subdomain = 'matunda' AND status != 'active';

-- Verify
SELECT id, name, subdomain, status FROM tenants WHERE subdomain = 'matunda';
```

Then clear the cache via API or wait 5 minutes for cache to expire.
