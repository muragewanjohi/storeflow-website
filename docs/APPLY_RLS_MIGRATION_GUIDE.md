# How to Apply RLS Migration

**Guide for enabling Row-Level Security (RLS) on all tenant-scoped tables**

---

## ⚠️ Important

RLS (Row-Level Security) is **critical** for production security. It ensures that tenants can only access their own data, even if there's a bug in the application code.

**Current Status:** RLS is **disabled** on all tenant-scoped tables. This must be fixed before production deployment.

---

## 🚀 Quick Fix

### Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to storeflow directory
cd C:\xampp\htdocs\storeflow

# Apply all migrations (including RLS)
npx supabase migration up

# This will apply:
# - 002_setup_rls_policies.sql (initial RLS setup)
# - 010_enable_rls_all_tenant_tables.sql (additional tenant tables)
```

### Option 2: Using Supabase Dashboard

1. **Go to Supabase Dashboard:** https://supabase.com/dashboard
2. **Select your project**
3. **Go to SQL Editor**
4. **Apply first migration:**
   - Open: `supabase/migrations/002_setup_rls_policies.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click "Run"
5. **Apply second migration (for missing tables):**
   - Open: `supabase/migrations/010_enable_rls_all_tenant_tables.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click "Run"

### Option 3: Using Prisma (if using Prisma migrations)

```bash
# The RLS migration is in Supabase migrations, not Prisma
# You'll need to run it manually via Supabase Dashboard or CLI
```

---

## 📋 What the Migration Does

The RLS migration (`002_setup_rls_policies.sql`) does three things:

1. **Creates `set_tenant_context()` function**
   - Stores the current tenant_id in the PostgreSQL session
   - Used by RLS policies to filter data

2. **Enables RLS on all tenant-scoped tables**
   - `ALTER TABLE products ENABLE ROW LEVEL SECURITY;`
   - `ALTER TABLE orders ENABLE ROW LEVEL SECURITY;`
   - ... and 25+ more tables

3. **Creates RLS policies for each table**
   - Each policy filters by `tenant_id = current_setting('app.current_tenant_id')::UUID`
   - Applies to SELECT, INSERT, UPDATE, DELETE operations

---

## ✅ Verification

After applying the migration, verify it worked:

```bash
# Run the verification script
npm run deploy:verify-rls
```

**Expected Output:**
```
✅ products                       RLS: Enabled  Policies: ✅ 1
✅ orders                         RLS: Enabled  Policies: ✅ 1
✅ customers                      RLS: Enabled  Policies: ✅ 1
...
```

**If you still see RLS disabled:**
- Check that the migration ran successfully
- Verify you're connected to the correct database
- Check Supabase logs for errors

---

## 🔍 Manual Verification (SQL)

You can also verify manually in Supabase SQL Editor:

```sql
-- Check RLS status on all tenant-scoped tables
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'products', 'orders', 'customers', 'categories',
    'pages', 'blogs', 'media_uploads', 'cart_items',
    'support_tickets', 'support_ticket_messages'
  )
ORDER BY tablename;

-- Check policies exist
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('products', 'orders', 'customers')
ORDER BY tablename, policyname;
```

---

## 🧪 Test Tenant Isolation

After enabling RLS, test that it works:

```sql
-- 1. Create a test tenant
INSERT INTO tenants (subdomain, name, status)
VALUES ('test-rls', 'Test RLS', 'active')
RETURNING id;

-- 2. Set tenant context
SELECT set_tenant_context('test-tenant-uuid'::UUID);

-- 3. Try to query products (should return empty or only this tenant's)
SELECT * FROM products;

-- 4. Without tenant context, should return empty
-- (RLS blocks access when tenant context is not set)
```

---

## ⚠️ Important Notes

1. **RLS is enforced at the database level**
   - Cannot be bypassed by application code
   - Provides defense-in-depth security

2. **Always set tenant context before queries**
   - Your application code should call `set_tenant_context()` in middleware
   - See `src/lib/tenant-context.ts` for implementation

3. **Service role key bypasses RLS**
   - The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS
   - Only use service role key in server-side code
   - Never expose service role key in client-side code

4. **RLS policies use session variables**
   - `current_setting('app.current_tenant_id')` must be set before queries
   - Each database connection has its own session

---

## 🐛 Troubleshooting

### Migration Fails

**Error:** `relation "products" does not exist`
- **Solution:** Run Prisma migrations first to create tables
- `npm run db:migrate:deploy`

**Error:** `permission denied`
- **Solution:** Make sure you're using the service role key or have proper permissions

### RLS Blocks All Queries

**Symptom:** All queries return empty results
- **Solution:** Make sure `set_tenant_context()` is being called
- Check middleware is setting tenant context correctly

### Policies Not Working

**Symptom:** RLS enabled but data still accessible across tenants
- **Solution:** Check policies are created correctly
- Verify `current_setting('app.current_tenant_id')` is being set

---

## 📚 Related Documentation

- [Security Guide](./SECURITY.md) - Complete RLS documentation
- [RLS Table Classification](./RLS_TABLE_CLASSIFICATION.md) - Which tables need RLS vs. remain unrestricted
- [Day 46-47 Deployment Guide](./DAY_46_47_DEPLOYMENT.md) - Production deployment
- [RLS Migration Files](../supabase/migrations/):
  - `002_setup_rls_policies.sql` - Initial RLS setup
  - `010_enable_rls_all_tenant_tables.sql` - Additional tenant tables

---

**Last Updated:** 2024
