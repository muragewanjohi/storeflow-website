-- Add composite index for faster product lookups by slug, tenant_id, and status
-- This significantly improves performance for product detail page queries

CREATE INDEX IF NOT EXISTS idx_products_tenant_slug_status 
ON products(tenant_id, slug, status)
WHERE status = 'active';

-- This index will speed up queries like:
-- SELECT * FROM products WHERE tenant_id = ? AND slug = ? AND status = 'active'

