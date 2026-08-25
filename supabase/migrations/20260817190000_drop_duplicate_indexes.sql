-- Fix duplicate_index performance advisory (6 pairs)
--
-- Each pair below is a byte-identical index (same columns, same btree, same
-- partial WHERE clause where applicable) — verified via pg_indexes before
-- writing this migration, not assumed from the advisor's summary text.
-- Keeping the one that matches prisma/schema.prisma's `map:` name where a
-- match exists, so the live DB doesn't drift from the Prisma source of
-- truth. The products.price pair has no Prisma-declared name on either
-- side; kept the more descriptive one (idx_products_tenant_price_range,
-- matching the min_price/max_price filter logic in
-- src/app/api/products/route.ts).
--
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index

DROP INDEX IF EXISTS public.idx_categories_tenant;               -- kept: idx_categories_tenant_id (prisma schema.prisma:174)
DROP INDEX IF EXISTS public.idx_order_products_order;            -- kept: idx_order_products_order_id (prisma schema.prisma:426)
DROP INDEX IF EXISTS public.idx_order_products_product;          -- kept: idx_order_products_product_id (prisma schema.prisma:427)
DROP INDEX IF EXISTS public.idx_order_products_tenant;           -- kept: idx_order_products_tenant_id (prisma schema.prisma:428)
DROP INDEX IF EXISTS public.idx_product_variants_product;        -- kept: idx_product_variants_product_id (prisma schema.prisma:633)
DROP INDEX IF EXISTS public.idx_products_tenant_active_price;    -- kept: idx_products_tenant_price_range (neither in prisma schema; kept more descriptive name)
