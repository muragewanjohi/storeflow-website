-- Performance optimization indexes for common queries
-- Run this migration to improve query performance

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_payment_status ON orders(tenant_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created_at ON orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status_created ON orders(tenant_id, status, created_at DESC);

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_tenant_status ON products(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_products_tenant_stock ON products(tenant_id, stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_tenant_status_stock ON products(tenant_id, status, stock_quantity);

-- Customers table indexes
CREATE INDEX IF NOT EXISTS idx_customers_tenant_created ON customers(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_email ON customers(tenant_id, email);

-- Product variants indexes
CREATE INDEX IF NOT EXISTS idx_product_variants_tenant_stock ON product_variants(tenant_id, stock_quantity);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);

-- Support tickets indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_status ON support_tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_created ON support_tickets(tenant_id, created_at DESC);

-- Landlord support tickets indexes
CREATE INDEX IF NOT EXISTS idx_landlord_tickets_tenant_status ON landlord_support_tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_landlord_tickets_tenant_updated ON landlord_support_tickets(tenant_id, updated_at DESC);

-- Order products indexes
CREATE INDEX IF NOT EXISTS idx_order_products_order ON order_products(order_id);
CREATE INDEX IF NOT EXISTS idx_order_products_product ON order_products(product_id);
CREATE INDEX IF NOT EXISTS idx_order_products_tenant ON order_products(tenant_id);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_status ON categories(tenant_id, status);

-- Static options (settings) indexes - already has unique constraint on (tenant_id, option_name)
-- CREATE INDEX IF NOT EXISTS idx_static_options_tenant_name ON static_options(tenant_id, option_name);

-- Analyze tables to update statistics
ANALYZE orders;
ANALYZE products;
ANALYZE customers;
ANALYZE product_variants;
ANALYZE support_tickets;
ANALYZE landlord_support_tickets;
ANALYZE order_products;
ANALYZE categories;

