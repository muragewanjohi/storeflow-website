-- ============================================
-- DukaNest: Enable RLS on ALL Tenant-Scoped Tables
-- ============================================
-- 
-- This migration ensures RLS is enabled on ALL tables that have tenant_id,
-- including tables that might have been missed in the initial migration.
--
-- Generated: 2024
-- Version: 1.0
-- ============================================

-- ============================================
-- 1. ENABLE RLS ON MISSING TENANT-SCOPED TABLES
-- ============================================

-- Form Management (tenant-scoped)
ALTER TABLE form_builders ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Inventory Management (tenant-scoped)
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;

-- Product Variant Attributes (tenant-scoped)
ALTER TABLE product_variant_attributes ENABLE ROW LEVEL SECURITY;

-- Tenant Themes (tenant-scoped - links tenants to themes)
ALTER TABLE tenant_themes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. CREATE RLS POLICIES FOR MISSING TABLES
-- ============================================

-- Form Builders Policy
DROP POLICY IF EXISTS "form_builders_tenant_isolation" ON form_builders;
CREATE POLICY "form_builders_tenant_isolation"
  ON form_builders
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Form Submissions Policy
DROP POLICY IF EXISTS "form_submissions_tenant_isolation" ON form_submissions;
CREATE POLICY "form_submissions_tenant_isolation"
  ON form_submissions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Inventory History Policy
DROP POLICY IF EXISTS "inventory_history_tenant_isolation" ON inventory_history;
CREATE POLICY "inventory_history_tenant_isolation"
  ON inventory_history
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Product Variant Attributes Policy
DROP POLICY IF EXISTS "product_variant_attributes_tenant_isolation" ON product_variant_attributes;
CREATE POLICY "product_variant_attributes_tenant_isolation"
  ON product_variant_attributes
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Tenant Themes Policy
DROP POLICY IF EXISTS "tenant_themes_tenant_isolation" ON tenant_themes;
CREATE POLICY "tenant_themes_tenant_isolation"
  ON tenant_themes
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================
-- 3. VERIFY RLS IS ENABLED ON ALL TENANT TABLES
-- ============================================
-- 
-- After running this migration, verify with:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
--   AND tablename IN (
--     'form_builders', 'form_submissions', 'inventory_history',
--     'product_variant_attributes', 'tenant_themes'
--   );
--
-- All should show rowsecurity = true
--
-- ============================================
-- NOTES
-- ============================================
-- 
-- Tables that should REMAIN UNRESTRICTED (no RLS):
-- - admins (landlord users)
-- - custom_domains (central domain management)
-- - landlord_support_tickets (landlord support)
-- - landlord_support_ticket_messages (landlord support)
-- - landlord_users (landlord users)
-- - plugins (central plugin registry)
-- - price_plans (central subscription plans)
-- - tenants (central tenant registry)
-- - themes (central theme registry)
--
-- These tables are shared across all tenants or are landlord-only,
-- so they should NOT have RLS enabled.
--
-- ============================================
