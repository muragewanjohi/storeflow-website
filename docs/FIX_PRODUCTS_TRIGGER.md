# Fix Products Trigger Error

## Problem
When creating products, you get this error:
```
Invalid prisma.products.create() invocation: The column 'new' does not exist in the current database.
```

**Root Cause:** The PostgreSQL trigger function is causing a conflict where PostgreSQL interprets `new` (lowercase) as a table/record name instead of the trigger variable `NEW` (uppercase).

## Solution

### Step 1: Apply the Fix Migration

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**
5. Open the file: `storeflow/supabase/migrations/010_fix_products_trigger.sql`
6. Copy **ALL** the contents (Ctrl+A, Ctrl+C)
7. Paste into the SQL Editor
8. Click **"Run"** or press `Ctrl+Enter`
9. Wait for execution to complete

**Option B: Using Supabase CLI**

```bash
cd c:\xampp\htdocs\storeflow
npx supabase db push
```

### Step 2: Verify the Fix

Run this query in Supabase SQL Editor:

```sql
-- Check trigger exists and is correct
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'products'
  AND trigger_name = 'products_search_vector_trigger';
```

You should see:
- `trigger_name`: `products_search_vector_trigger`
- `event_manipulation`: `INSERT` and `UPDATE`
- `action_timing`: `BEFORE`

### Step 3: Test Product Creation

1. Restart your development server
2. Try creating a product from the dashboard
3. It should work without errors

## What the Fix Does

The migration:
1. **Drops the old trigger** to remove any conflicts
2. **Recreates the trigger function** with:
   - Explicit `NEW` (uppercase) references
   - `$function$` delimiter instead of `$$` to avoid conflicts
   - `STABLE` keyword for better PostgreSQL optimization
   - Defensive NULL checks
3. **Recreates the trigger** with proper configuration
4. **Verifies** the trigger was created successfully

## If the Error Persists

If you still get the error after applying the fix:

1. **Check for a table named `new`:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name = 'new';
   ```
   
   If a table named `new` exists, rename or drop it.

2. **Manually disable and re-enable the trigger:**
   ```sql
   -- Disable
   ALTER TABLE products DISABLE TRIGGER products_search_vector_trigger;
   
   -- Re-enable
   ALTER TABLE products ENABLE TRIGGER products_search_vector_trigger;
   ```

3. **Check the trigger function definition:**
   ```sql
   SELECT routine_definition
   FROM information_schema.routines
   WHERE routine_schema = 'public'
     AND routine_name = 'products_search_vector_update';
   ```
   
   It should use `NEW` (uppercase) throughout, not `new` (lowercase).

## Related Files

- Migration: `storeflow/supabase/migrations/010_fix_products_trigger.sql`
- Original trigger: `storeflow/supabase/migrations/003_add_fulltext_search.sql`
- Product API: `storeflow/src/app/api/products/route.ts`
