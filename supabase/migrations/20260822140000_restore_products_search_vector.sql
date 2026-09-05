/**
 * Restore products.search_vector (found missing via a real production
 * error surfaced during live testing on 2026-08-22).
 *
 * Root cause: the search_vector tsvector column existed at some point
 * (products_search_vector_trigger + products_search_vector_update() are
 * both still present) but the column itself was dropped from the live
 * table while the trigger/function were left behind, DISABLED
 * (tgenabled = 'D' — confirmed via pg_trigger before writing this
 * migration). Application code already assumes ownership of this column
 * without the trigger (src/app/api/products/route.ts manually
 * $executeRaw's an UPDATE after every create, matching the trigger's own
 * logic, with its own comment "since trigger is disabled") — so this
 * migration restores ONLY the column + index + backfill, deliberately
 * leaving the trigger disabled rather than re-enabling it, to match that
 * already-established intent instead of reintroducing a second writer.
 *
 * Effects of the missing column, both already silently tolerated by
 * existing try/catch fallbacks (so nothing was hard-broken, just degraded
 * — this is a quality fix, not a hotfix for an outage):
 *  - POST /api/products: every product creation logged a caught, non-fatal
 *    Prisma error ("column search_vector does not exist") instead of
 *    successfully setting it.
 *  - GET /api/products (search): plainto_tsquery/ts_rank search always
 *    fell back to a plain ILIKE (no relevance ranking) since the primary
 *    query always threw.
 */

-- Add the column back.
ALTER TABLE products
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Same GIN index the original 003_add_fulltext_search.sql migration defined.
CREATE INDEX IF NOT EXISTS idx_products_search_vector
ON products USING GIN(search_vector);

-- Backfill every existing product — mirrors the exact expression
-- src/app/api/products/route.ts already writes on create/update, and what
-- the (disabled) trigger function itself computes.
UPDATE products
SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(sku, '')), 'A')
WHERE search_vector IS NULL;
