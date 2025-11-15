-- ============================================
-- StoreFlow Row-Level Security (RLS) Setup
-- Multi-Tenant Data Isolation
-- ============================================
-- 
-- This migration sets up Row-Level Security policies
-- to ensure automatic tenant data isolation
--
-- Generated: 2024
-- Version: 1.0
-- ============================================

-- ============================================
-- 1. CREATE TENANT CONTEXT FUNCTION
-- ============================================

-- Function to set tenant context for RLS policies
-- This function stores the current tenant_id in the PostgreSQL session
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set the tenant_id in the current session
  -- This will be used by RLS policies to filter data
  PERFORM set_config('app.current_tenant_id', tenant_id::text, true);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO anon;

-- ============================================
-- 2. ENABLE RLS ON TENANT-SCOPED TABLES
-- ============================================

-- Core Ecommerce Tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Content Management Tables
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

-- Product Management Tables
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Shopping Tables
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Customer Management Tables
ALTER TABLE user_delivery_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Support Tables
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Media & Configuration Tables
ALTER TABLE media_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE static_options ENABLE ROW LEVEL SECURITY;

-- Payment Tables (tenant-scoped)
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

-- Location Tables (optional tenant_id)
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE states ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CREATE RLS POLICIES
-- ============================================

-- Policy Template Function (for reference)
-- All policies follow this pattern:
-- USING (tenant_id = current_setting('app.current_tenant_id')::UUID)

-- ============================================
-- Core Ecommerce Tables Policies
-- ============================================

-- Products Policy
DROP POLICY IF EXISTS "products_tenant_isolation" ON products;
CREATE POLICY "products_tenant_isolation"
  ON products
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Orders Policy
DROP POLICY IF EXISTS "orders_tenant_isolation" ON orders;
CREATE POLICY "orders_tenant_isolation"
  ON orders
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Order Products Policy
DROP POLICY IF EXISTS "order_products_tenant_isolation" ON order_products;
CREATE POLICY "order_products_tenant_isolation"
  ON order_products
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Customers Policy
DROP POLICY IF EXISTS "customers_tenant_isolation" ON customers;
CREATE POLICY "customers_tenant_isolation"
  ON customers
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Categories Policy
DROP POLICY IF EXISTS "categories_tenant_isolation" ON categories;
CREATE POLICY "categories_tenant_isolation"
  ON categories
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Product Categories Policy
DROP POLICY IF EXISTS "product_categories_tenant_isolation" ON product_categories;
CREATE POLICY "product_categories_tenant_isolation"
  ON product_categories
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================
-- Content Management Tables Policies
-- ============================================

-- Pages Policy
DROP POLICY IF EXISTS "pages_tenant_isolation" ON pages;
CREATE POLICY "pages_tenant_isolation"
  ON pages
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Blogs Policy
DROP POLICY IF EXISTS "blogs_tenant_isolation" ON blogs;
CREATE POLICY "blogs_tenant_isolation"
  ON blogs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Blog Categories Policy
DROP POLICY IF EXISTS "blog_categories_tenant_isolation" ON blog_categories;
CREATE POLICY "blog_categories_tenant_isolation"
  ON blog_categories
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================
-- Product Management Tables Policies
-- ============================================

-- Product Variants Policy
DROP POLICY IF EXISTS "product_variants_tenant_isolation" ON product_variants;
CREATE POLICY "product_variants_tenant_isolation"
  ON product_variants
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Product Reviews Policy
DROP POLICY IF EXISTS "product_reviews_tenant_isolation" ON product_reviews;
CREATE POLICY "product_reviews_tenant_isolation"
  ON product_reviews
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Product Wishlists Policy
DROP POLICY IF EXISTS "product_wishlists_tenant_isolation" ON product_wishlists;
CREATE POLICY "product_wishlists_tenant_isolation"
  ON product_wishlists
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Attributes Policy
DROP POLICY IF EXISTS "attributes_tenant_isolation" ON attributes;
CREATE POLICY "attributes_tenant_isolation"
  ON attributes
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Attribute Values Policy
DROP POLICY IF EXISTS "attribute_values_tenant_isolation" ON attribute_values;
CREATE POLICY "attribute_values_tenant_isolation"
  ON attribute_values
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Brands Policy
DROP POLICY IF EXISTS "brands_tenant_isolation" ON brands;
CREATE POLICY "brands_tenant_isolation"
  ON brands
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================
-- Shopping Tables Policies
-- ============================================

-- Cart Items Policy
DROP POLICY IF EXISTS "cart_items_tenant_isolation" ON cart_items;
CREATE POLICY "cart_items_tenant_isolation"
  ON cart_items
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Coupons Policy
DROP POLICY IF EXISTS "coupons_tenant_isolation" ON coupons;
CREATE POLICY "coupons_tenant_isolation"
  ON coupons
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================
-- Customer Management Tables Policies
-- ============================================

-- User Delivery Addresses Policy
DROP POLICY IF EXISTS "user_delivery_addresses_tenant_isolation" ON user_delivery_addresses;
CREATE POLICY "user_delivery_addresses_tenant_isolation"
  ON user_delivery_addresses
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Wallets Policy
DROP POLICY IF EXISTS "wallets_tenant_isolation" ON wallets;
CREATE POLICY "wallets_tenant_isolation"
  ON wallets
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================
-- Support Tables Policies
-- ============================================

-- Support Tickets Policy
DROP POLICY IF EXISTS "support_tickets_tenant_isolation" ON support_tickets;
CREATE POLICY "support_tickets_tenant_isolation"
  ON support_tickets
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Support Ticket Messages Policy
DROP POLICY IF EXISTS "support_ticket_messages_tenant_isolation" ON support_ticket_messages;
CREATE POLICY "support_ticket_messages_tenant_isolation"
  ON support_ticket_messages
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================
-- Media & Configuration Tables Policies
-- ============================================

-- Media Uploads Policy
DROP POLICY IF EXISTS "media_uploads_tenant_isolation" ON media_uploads;
CREATE POLICY "media_uploads_tenant_isolation"
  ON media_uploads
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Static Options Policy
DROP POLICY IF EXISTS "static_options_tenant_isolation" ON static_options;
CREATE POLICY "static_options_tenant_isolation"
  ON static_options
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================
-- Payment Tables Policies
-- ============================================

-- Payment Logs Policy
DROP POLICY IF EXISTS "payment_logs_tenant_isolation" ON payment_logs;
CREATE POLICY "payment_logs_tenant_isolation"
  ON payment_logs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================
-- Location Tables Policies (with NULL check)
-- ============================================

-- Cities Policy (tenant_id is optional)
DROP POLICY IF EXISTS "cities_tenant_isolation" ON cities;
CREATE POLICY "cities_tenant_isolation"
  ON cities
  FOR ALL
  USING (
    tenant_id IS NULL 
    OR tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Countries Policy (tenant_id is optional)
DROP POLICY IF EXISTS "countries_tenant_isolation" ON countries;
CREATE POLICY "countries_tenant_isolation"
  ON countries
  FOR ALL
  USING (
    tenant_id IS NULL 
    OR tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- States Policy (tenant_id is optional)
DROP POLICY IF EXISTS "states_tenant_isolation" ON states;
CREATE POLICY "states_tenant_isolation"
  ON states
  FOR ALL
  USING (
    tenant_id IS NULL 
    OR tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- ============================================
-- NOTES
-- ============================================
-- 
-- 1. All policies use FOR ALL (SELECT, INSERT, UPDATE, DELETE)
-- 2. Policies filter by tenant_id matching the session context
-- 3. Location tables (cities, countries, states) allow NULL tenant_id for shared data
-- 4. The set_tenant_context() function must be called before queries
-- 5. RLS policies are enforced at the database level - cannot be bypassed
--
-- ============================================

