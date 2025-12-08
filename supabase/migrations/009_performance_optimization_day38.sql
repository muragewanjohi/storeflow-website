-- Day 38: Performance Optimization - Additional Indexes
-- This migration adds indexes for common query patterns to improve performance

-- Products table - Additional indexes for search and filtering
CREATE INDEX IF NOT EXISTS idx_products_tenant_slug_status ON products(tenant_id, slug, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_products_tenant_name_search ON products(tenant_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_products_tenant_price_range ON products(tenant_id, price) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_products_tenant_category_status ON products(tenant_id, category_id, status);
CREATE INDEX IF NOT EXISTS idx_products_tenant_brand_status ON products(tenant_id, brand_id, status);

-- Full-text search index for products (if search_vector column exists)
-- This is created separately as it requires the search_vector column
-- CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING GIN(search_vector);

-- Orders table - Additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_tenant_user ON orders(tenant_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_tenant_order_number ON orders(tenant_id, order_number);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_email ON orders(tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created_at ON orders(tenant_id, created_at DESC);

-- Order products - Join optimization
CREATE INDEX IF NOT EXISTS idx_order_products_tenant_order ON order_products(tenant_id, order_id);
CREATE INDEX IF NOT EXISTS idx_order_products_tenant_product ON order_products(tenant_id, product_id);

-- Cart items - Performance optimization
CREATE INDEX IF NOT EXISTS idx_cart_items_tenant_user ON cart_items(tenant_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_items_tenant_product ON cart_items(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_tenant_updated ON cart_items(tenant_id, updated_at DESC);

-- Pages and blogs - Content management queries
CREATE INDEX IF NOT EXISTS idx_pages_tenant_slug_status ON pages(tenant_id, slug, status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blogs_tenant_slug_status ON blogs(tenant_id, slug, status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blogs_tenant_category_status ON blogs(tenant_id, category_id, status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blogs_tenant_created_status ON blogs(tenant_id, created_at DESC, status) WHERE status = 'published';

-- Media uploads - File management
CREATE INDEX IF NOT EXISTS idx_media_uploads_tenant_created ON media_uploads(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_uploads_tenant_type ON media_uploads(tenant_id, file_type);

-- Subscriptions - Plan and expiry queries
CREATE INDEX IF NOT EXISTS idx_tenants_plan_status ON tenants(plan_id, status);
CREATE INDEX IF NOT EXISTS idx_tenants_expire_date ON tenants(expire_date) WHERE expire_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_status_created ON tenants(status, created_at DESC);

-- Price plans - Active plans lookup
CREATE INDEX IF NOT EXISTS idx_price_plans_status_price ON price_plans(status, price) WHERE status = 'active';

-- Analyze tables to update query planner statistics
ANALYZE products;
ANALYZE orders;
ANALYZE order_products;
ANALYZE cart_items;
ANALYZE pages;
ANALYZE blogs;
ANALYZE media_uploads;
ANALYZE tenants;
ANALYZE price_plans;

-- Add comment for documentation
COMMENT ON INDEX idx_products_tenant_slug_status IS 'Optimizes product listing by tenant, slug, and status';
COMMENT ON INDEX idx_orders_tenant_created_at IS 'Optimizes order listing with date sorting by tenant';
COMMENT ON INDEX idx_cart_items_tenant_user IS 'Optimizes cart lookup by tenant and user';

