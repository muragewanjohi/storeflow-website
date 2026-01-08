# Migration Sync Status

This document tracks which SQL migrations have been run directly on Supabase and whether they're reflected in the Prisma schema.

## ✅ All Migrations Synced

### 1. **analytics_tracking table** ✅
- **Migration**: `prisma/migrations/add_analytics_tracking.sql`
- **Status**: ✅ In Prisma schema
- **Location**: `model analytics_tracking` (line 25)
- **Fields**: All fields present including `country` field

### 2. **country_code in customers** ✅
- **Migration**: `prisma/migrations/add_country_code_to_customers.sql`
- **Status**: ✅ In Prisma schema
- **Location**: `model customers` (line 255)
- **Field**: `country_code String? @db.VarChar(2)`

### 3. **country in tenants** ✅
- **Migration**: `prisma/migrations/add_country_to_tenants.sql`
- **Status**: ✅ In Prisma schema
- **Location**: `model tenants` (line 800)
- **Field**: `country String? @db.VarChar(2)`

### 4. **country in analytics_tracking** ✅
- **Migration**: `prisma/migrations/add_country_to_analytics.sql`
- **Status**: ✅ In Prisma schema
- **Location**: `model analytics_tracking` (line 36)
- **Field**: `country String? @db.VarChar(100)`

### 5. **cron_job_logs table** ✅
- **Migration**: `prisma/migrations/add_cron_job_logs.sql`
- **Status**: ✅ In Prisma schema
- **Location**: `model cron_job_logs` (line 901)
- **Fields**: All fields present

### 6. **mfa_otp_codes table** ✅ (Just Added)
- **Migration**: `prisma/migrations/add_mfa_otp_codes/migration.sql`
- **Status**: ✅ Now in Prisma schema
- **Location**: `model mfa_otp_codes` (after trusted_devices)
- **Fields**: All fields present with proper indexes

### 7. **trusted_devices table** ✅
- **Migration**: `prisma/migrations/add_trusted_devices/migration.sql`
- **Status**: ✅ In Prisma schema
- **Location**: `model trusted_devices` (line 739)
- **Fields**: All fields present with proper indexes

### 8. **cart_items performance indexes** ✅
- **Migration**: `prisma/migrations/20241220000000_add_cart_performance_indexes/migration.sql`
- **Status**: ✅ In Prisma schema
- **Location**: `model cart_items` (lines 150, 153)
- **Indexes**: 
  - `idx_cart_items_tenant_user` ✅
  - `idx_cart_items_product_id` ✅

### 9. **subscription_changes table** ✅
- **Migration**: `scripts/add-subscription-fields.sql` (run manually)
- **Status**: ✅ In Prisma schema
- **Location**: `model subscription_changes` (end of file)
- **Fields**: All fields present

### 10. **Tenants subscription fields** ✅
- **Migration**: `scripts/add-subscription-fields.sql` (run manually)
- **Status**: ✅ In Prisma schema
- **Location**: `model tenants` (lines 800-802)
- **Fields**: 
  - `scheduled_plan_id` ✅
  - `scheduled_plan_change_date` ✅
  - `upgrade_prorated_amount` ✅

## 📋 Summary

**Total Migrations Checked**: 10
**Synced**: 10 ✅
**Missing**: 0

## 🔄 Next Steps

1. **Regenerate Prisma Client**:
   ```bash
   npx prisma generate
   ```

2. **Verify in Database** (optional):
   ```sql
   -- Check all tables exist
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN (
       'analytics_tracking',
       'mfa_otp_codes',
       'trusted_devices',
       'cron_job_logs',
       'subscription_changes'
     );
   ```

3. **Test Prisma Queries**:
   ```typescript
   // Should work without errors
   await prisma.mfa_otp_codes.findMany();
   await prisma.trusted_devices.findMany();
   await prisma.analytics_tracking.findMany();
   await prisma.subscription_changes.findMany();
   ```

## 📝 Notes

- All migrations run directly on Supabase are now reflected in the Prisma schema
- The `mfa_otp_codes` model was missing but has been added
- All indexes from migrations are properly defined in the schema
- Foreign key constraints are properly mapped in Prisma relations

---

**Last Updated**: 2025-01-08
**Status**: ✅ All migrations synced
