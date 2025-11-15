# How to Apply RLS Migration to Supabase Cloud

**Guide for applying Row-Level Security migration to your Supabase project**

---

## 🎯 Quick Method: Supabase Dashboard (Recommended)

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your StoreFlow project

### Step 2: Open SQL Editor
1. Click **"SQL Editor"** in the left sidebar
2. Click **"New query"**

### Step 3: Copy Migration SQL
1. Open `storeflow/supabase/migrations/002_setup_rls_policies.sql`
2. Copy **ALL** the contents (Ctrl+A, Ctrl+C)

### Step 4: Paste and Run
1. Paste the SQL into the SQL Editor
2. Click **"Run"** or press `Ctrl+Enter`
3. Wait for execution to complete

### Step 5: Verify
Run this query to verify RLS is enabled:

```sql
-- Check RLS is enabled on products table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'products';
```

Should show `rowsecurity = true`

---

## 🔧 Alternative Method: Supabase CLI (Remote)

### Step 1: Link to Remote Project

```bash
cd storeflow
npx supabase link --project-ref your-project-ref
```

**To find your project ref:**
- Go to Supabase Dashboard → Settings → General
- Copy the "Reference ID"

### Step 2: Apply Migration

```bash
npx supabase db push
```

Or apply specific migration:

```bash
npx supabase migration up
```

---

## ✅ Verification Queries

After applying the migration, run these to verify:

### 1. Check RLS is Enabled

```sql
-- List all tables with RLS enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;
```

Should show 25+ tables.

### 2. Check Policies Exist

```sql
-- List all RLS policies
SELECT 
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

Should show policies for all tenant-scoped tables.

### 3. Test Tenant Context Function

```sql
-- Test set_tenant_context function
SELECT set_tenant_context('00000000-0000-0000-0000-000000000000'::UUID);

-- Check context was set
SELECT current_setting('app.current_tenant_id', true);
```

---

## 🚨 Troubleshooting

### Error: "function set_tenant_context does not exist"

**Solution:** The migration didn't run completely. Re-run the SQL migration file.

### Error: "permission denied"

**Solution:** Make sure you're using the correct database credentials. Use Supabase Dashboard SQL Editor (it has full permissions).

### Error: "relation does not exist"

**Solution:** Some tables might not exist yet. Check which tables exist:

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

Then comment out policies for non-existent tables in the migration file.

---

## 📝 Notes

- **Safe to run multiple times:** The migration uses `DROP POLICY IF EXISTS` and `CREATE OR REPLACE FUNCTION`, so it's safe to re-run
- **No data loss:** RLS policies don't modify data, only add security rules
- **Backup recommended:** Always backup your database before running migrations (though this one is safe)

---

## 🎯 Next Steps

After applying RLS:

1. ✅ Test queries work with tenant context
2. ✅ Verify RLS filters data correctly
3. ✅ Update your code to use tenant-aware clients
4. ✅ Test with multiple tenants

---

**Last Updated:** 2024

