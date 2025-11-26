# PostgreSQL Full-Text Search Setup Guide

## Overview

This guide explains how to set up and use PostgreSQL Full-Text Search for product search in StoreFlow.

## Benefits

✅ **Better Performance** - GIN indexes make searches much faster  
✅ **Relevance Ranking** - Results sorted by relevance, not just alphabetical  
✅ **Zero Cost** - Uses existing PostgreSQL database  
✅ **Automatic Updates** - Trigger keeps search index updated automatically  

## Setup Steps

### Step 1: Apply the Migration

Run the migration SQL in your Supabase dashboard:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `storeflow/supabase/migrations/003_add_fulltext_search.sql`
3. Paste and run the SQL

**Or use Supabase CLI:**
```bash
cd storeflow
npx supabase migration up
```

### Step 2: Verify the Migration

Check that the migration was successful:

```sql
-- Check if search_vector column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'search_vector';

-- Check if index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'products' AND indexname = 'idx_products_search_vector';

-- Check if trigger exists
SELECT trigger_name, event_manipulation 
FROM information_schema.triggers 
WHERE event_object_table = 'products' 
AND trigger_name = 'products_search_vector_trigger';
```

### Step 3: Test the Search

The search API will automatically use full-text search once the migration is applied. It will fall back to ILIKE if the migration hasn't been run yet.

## How It Works

### Automatic Indexing

When a product is created or updated:
1. The trigger `products_search_vector_trigger` fires
2. It updates the `search_vector` column with:
   - **Name** (weight A - highest priority)
   - **Description** (weight B - medium priority)
   - **SKU** (weight A - highest priority)

### Search Query

When a user searches:
1. PostgreSQL uses the `search_vector` GIN index
2. Ranks results by relevance using `ts_rank`
3. Returns results sorted by relevance

### Fallback

If full-text search fails (migration not applied), the API automatically falls back to ILIKE queries.

## Performance

- **Before:** ILIKE queries can be slow on large tables
- **After:** GIN index makes searches fast even with 100k+ products
- **Typical Query Time:** < 50ms for most searches

## Maintenance

The search index is automatically maintained:
- ✅ New products are indexed automatically
- ✅ Updated products are re-indexed automatically
- ✅ No manual maintenance required

## Troubleshooting

### Search not working?

1. **Check if migration was applied:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'products' AND column_name = 'search_vector';
   ```

2. **Manually update existing products:**
   ```sql
   UPDATE products 
   SET search_vector =
     setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
     setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
     setweight(to_tsvector('english', COALESCE(sku, '')), 'A')
   WHERE search_vector IS NULL;
   ```

3. **Check API logs** - The API will log warnings if full-text search fails

## Next Steps

If you need even better search (typo tolerance, faceted search), consider upgrading to **MeiliSearch** (see `SEARCH_OPTIONS_ANALYSIS.md`).

