# Apply Product Sorting Indexes - Performance Fix

## Problem
Products are taking 9+ seconds to load, especially when sorting. This is due to missing database indexes for sorting operations.

## Solution
Apply migration `010_products_sorting_indexes.sql` to add indexes for:
- Sorting by `created_at` (newest/oldest)
- Sorting by `price` (low/high)
- Sorting by `name` (alphabetical)

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click **SQL Editor**

2. **Run the Migration**
   - Open file: `supabase/migrations/010_products_sorting_indexes.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run**

3. **Verify Indexes Created**
   - Check that indexes were created successfully
   - You should see: "Success. No rows returned"

### Option 2: Supabase CLI

```powershell
cd c:\xampp\htdocs\storeflow
npx supabase migration up
```

### Option 3: Direct SQL Connection

If you have direct database access:

```sql
-- Run the contents of 010_products_sorting_indexes.sql
-- This will create the indexes needed for fast sorting
```

## Expected Performance Improvement

**Before:**
- First load: 9+ seconds
- Sorting: 9+ seconds

**After (with indexes):**
- First load: 200-500ms (database query)
- Second load: <100ms (cached)
- Sorting: 200-500ms (database query with index)
- Cached sorting: <100ms

## Verification

After applying the migration, check Vercel logs for:
- `fetchDuration: XXXms` - Should be <500ms for DB queries
- `isCached: true` - Should show true for subsequent requests
- `totalDuration: XXXms` - Should be <1000ms total

## What the Indexes Do

1. **`idx_products_tenant_status_created_at`**
   - Optimizes: `WHERE tenant_id = X AND status = 'active' ORDER BY created_at DESC`
   - Used for: "New" products sorting

2. **`idx_products_tenant_status_price`**
   - Optimizes: `WHERE tenant_id = X AND status = 'active' ORDER BY price ASC/DESC`
   - Used for: "Low Price" sorting

3. **`idx_products_tenant_status_name`**
   - Optimizes: `WHERE tenant_id = X AND status = 'active' ORDER BY name ASC/DESC`
   - Used for: Alphabetical sorting

4. **`idx_products_tenant_active_created`**
   - Optimizes: Active products sorted by created_at
   - Composite index for common query pattern

5. **`idx_products_tenant_active_price`**
   - Optimizes: Active products sorted by price
   - Composite index for common query pattern

---

**Status**: Ready to apply  
**Impact**: Should reduce load times from 9s to <500ms  
**Last Updated**: January 15, 2026
