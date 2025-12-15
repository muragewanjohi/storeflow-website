# Manual RLS Verification Guide

**If the automated verification script fails, use this manual method**

---

## 🔍 Why Manual Verification?

The automated script (`npm run deploy:verify-rls`) requires a direct database connection. If you're getting connection errors, you can verify RLS manually using the Supabase Dashboard.

---

## 📋 Step-by-Step Manual Verification

### Step 1: Open Supabase SQL Editor

1. Go to **Supabase Dashboard:** https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)

### Step 2: Check RLS Status on Tenant-Scoped Tables

Copy and paste this SQL query:

```sql
-- Check RLS status on all tenant-scoped tables
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'products', 'orders', 'order_products', 'customers', 'categories',
    'product_categories', 'pages', 'blogs', 'blog_categories',
    'product_variants', 'product_reviews', 'product_wishlists',
    'product_variant_attributes', 'attributes', 'attribute_values',
    'brands', 'cart_items', 'coupons', 'user_delivery_addresses',
    'wallets', 'support_tickets', 'support_ticket_messages',
    'media_uploads', 'static_options', 'form_builders',
    'form_submissions', 'inventory_history', 'payment_logs',
    'tenant_themes', 'cities', 'countries', 'states'
  )
ORDER BY tablename;
```

**Expected Result:** All tables should show `rls_enabled = true` (✅ ENABLED)

### Step 3: Check RLS Policies Exist

```sql
-- Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS POLICIES'
    ELSE '❌ NO POLICIES'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'products', 'orders', 'customers', 'categories',
    'form_builders', 'form_submissions', 'inventory_history'
  )
GROUP BY tablename
ORDER BY tablename;
```

**Expected Result:** All tables should have at least 1 policy

### Step 4: Check Central Tables (Should be UNRESTRICTED)

```sql
-- Check central/landlord tables (should NOT have RLS)
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '⚠️ HAS RLS (unexpected)'
    ELSE '✅ UNRESTRICTED (correct)'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'tenants', 'price_plans', 'themes', 'plugins',
    'custom_domains', 'admins', 'landlord_users',
    'landlord_support_tickets', 'landlord_support_ticket_messages'
  )
ORDER BY tablename;
```

**Expected Result:** All tables should show `rls_enabled = false` (✅ UNRESTRICTED)

### Step 5: Verify Tenant Context Function Exists

```sql
-- Check if set_tenant_context function exists
SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name = 'set_tenant_context' THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'set_tenant_context';
```

**Expected Result:** Function should exist

---

## 🔧 If RLS is Not Enabled

If you see tables with `rls_enabled = false`, apply the migrations:

### Option 1: Using Supabase Dashboard

1. **Go to SQL Editor**
2. **Open migration file:** `supabase/migrations/002_setup_rls_policies.sql`
3. **Copy entire contents**
4. **Paste into SQL Editor**
5. **Click "Run"**
6. **Repeat for:** `supabase/migrations/010_enable_rls_all_tenant_tables.sql`

### Option 2: Using Supabase CLI (if local Supabase is running)

```bash
cd C:\xampp\htdocs\storeflow
npx supabase migration up
```

---

## ✅ Verification Checklist

After applying migrations, verify:

- [ ] All tenant-scoped tables show `rls_enabled = true`
- [ ] All tenant-scoped tables have at least 1 policy
- [ ] Central tables show `rls_enabled = false` (UNRESTRICTED)
- [ ] `set_tenant_context()` function exists
- [ ] No errors in SQL execution

---

## 🐛 Troubleshooting

### Connection Errors

**Error:** "Cannot fetch data from service: fetch failed"

**Solutions:**
1. Check `DATABASE_URL` or `DIRECT_URL` in `.env.local`
2. For Supabase, use `DIRECT_URL` (port 5432) for raw queries
3. Verify database is accessible
4. Check network/firewall settings
5. Use Supabase Dashboard SQL Editor instead (manual method)

### RLS Still Disabled After Migration

**Possible Causes:**
1. Migration didn't run successfully
2. Migration file has errors
3. Database connection issue during migration

**Solutions:**
1. Check Supabase logs for migration errors
2. Re-run migration manually in SQL Editor
3. Verify migration SQL syntax is correct

---

## 📚 Related Documentation

- [Apply RLS Migration Guide](./APPLY_RLS_MIGRATION_GUIDE.md)
- [RLS Table Classification](./RLS_TABLE_CLASSIFICATION.md)
- [Security Guide](./SECURITY.md)

---

**Last Updated:** 2024
