-- Migration: Add indexes for product sorting performance
-- This addresses slow product loading and sorting (9+ seconds)
-- Date: 2026-01-15

-- Index for sorting by created_at (newest first/last)
-- Used when sort_by=created_at
CREATE INDEX IF NOT EXISTS idx_products_tenant_status_created_at 
ON products(tenant_id, status, created_at DESC) 
WHERE status = 'active';

-- Index for sorting by price (low to high / high to low)
-- Used when sort_by=price
CREATE INDEX IF NOT EXISTS idx_products_tenant_status_price 
ON products(tenant_id, status, price) 
WHERE status = 'active';

-- Index for sorting by name (alphabetical)
-- Used when sort_by=name
CREATE INDEX IF NOT EXISTS idx_products_tenant_status_name 
ON products(tenant_id, status, name) 
WHERE status = 'active';

-- Composite index for common filter + sort combinations
-- tenant_id + status + created_at (for "new" products)
CREATE INDEX IF NOT EXISTS idx_products_tenant_active_created 
ON products(tenant_id, created_at DESC) 
WHERE status = 'active';

-- tenant_id + status + price (for "low price" sorting)
CREATE INDEX IF NOT EXISTS idx_products_tenant_active_price 
ON products(tenant_id, price) 
WHERE status = 'active';

-- Update query planner statistics
ANALYZE products;

-- Add comments for documentation
COMMENT ON INDEX idx_products_tenant_status_created_at IS 'Optimizes product listing sorted by created_at (newest/oldest)';
COMMENT ON INDEX idx_products_tenant_status_price IS 'Optimizes product listing sorted by price (low/high)';
COMMENT ON INDEX idx_products_tenant_status_name IS 'Optimizes product listing sorted by name (alphabetical)';
COMMENT ON INDEX idx_products_tenant_active_created IS 'Optimizes active products sorted by created_at';
COMMENT ON INDEX idx_products_tenant_active_price IS 'Optimizes active products sorted by price';
