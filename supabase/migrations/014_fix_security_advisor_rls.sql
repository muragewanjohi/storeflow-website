-- Fix Supabase Security Advisor findings for PostgREST-exposed public tables.
-- Server-side service-role and table-owner access continue to bypass RLS.

-- Enable RLS on central/server-only tables. No public policies are added.
ALTER TABLE IF EXISTS tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landlord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cron_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mfa_otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscription_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS onboarding_starter_packs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tenant-scoped tables.
ALTER TABLE IF EXISTS sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landlord_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS landlord_support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on public catalog/help tables and add narrow read policies below.
ALTER TABLE IF EXISTS themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS price_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_guide_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_guide_articles ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped access follows the existing app.current_tenant_id pattern.
DROP POLICY IF EXISTS sales_tenant_isolation ON sales;
CREATE POLICY sales_tenant_isolation
  ON sales
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

DROP POLICY IF EXISTS product_sales_tenant_isolation ON product_sales;
CREATE POLICY product_sales_tenant_isolation
  ON product_sales
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

DROP POLICY IF EXISTS delivery_zones_tenant_isolation ON delivery_zones;
CREATE POLICY delivery_zones_tenant_isolation
  ON delivery_zones
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

DROP POLICY IF EXISTS analytics_sessions_tenant_isolation ON analytics_sessions;
CREATE POLICY analytics_sessions_tenant_isolation
  ON analytics_sessions
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

DROP POLICY IF EXISTS analytics_page_views_tenant_isolation ON analytics_page_views;
CREATE POLICY analytics_page_views_tenant_isolation
  ON analytics_page_views
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

DROP POLICY IF EXISTS analytics_events_tenant_isolation ON analytics_events;
CREATE POLICY analytics_events_tenant_isolation
  ON analytics_events
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

DROP POLICY IF EXISTS landlord_support_tickets_tenant_isolation ON landlord_support_tickets;
CREATE POLICY landlord_support_tickets_tenant_isolation
  ON landlord_support_tickets
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

DROP POLICY IF EXISTS landlord_support_ticket_messages_tenant_isolation ON landlord_support_ticket_messages;
CREATE POLICY landlord_support_ticket_messages_tenant_isolation
  ON landlord_support_ticket_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM landlord_support_tickets
      WHERE landlord_support_tickets.id = landlord_support_ticket_messages.ticket_id
        AND landlord_support_tickets.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM landlord_support_tickets
      WHERE landlord_support_tickets.id = landlord_support_ticket_messages.ticket_id
        AND landlord_support_tickets.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
    )
  );

-- Public read-only access for non-sensitive catalog/help content.
DROP POLICY IF EXISTS price_plans_public_read_active ON price_plans;
CREATE POLICY price_plans_public_read_active
  ON price_plans
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS themes_public_read_active ON themes;
CREATE POLICY themes_public_read_active
  ON themes
  FOR SELECT
  TO anon, authenticated
  USING (status = true);

DROP POLICY IF EXISTS plugins_public_read_active ON plugins;
CREATE POLICY plugins_public_read_active
  ON plugins
  FOR SELECT
  TO anon, authenticated
  USING (status = true);

DROP POLICY IF EXISTS user_guide_categories_public_read_active ON user_guide_categories;
CREATE POLICY user_guide_categories_public_read_active
  ON user_guide_categories
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS user_guide_articles_public_read_active ON user_guide_articles;
CREATE POLICY user_guide_articles_public_read_active
  ON user_guide_articles
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM user_guide_categories
      WHERE user_guide_categories.id = user_guide_articles.category_id
        AND user_guide_categories.is_active = true
    )
  );

-- Harden functions flagged by Supabase for mutable search_path.
ALTER FUNCTION public.set_tenant_context(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_session_activity() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_session_events_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION public.products_search_vector_update() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_onboarding_starter_packs_updated_at() SET search_path = public, pg_temp;

-- set_tenant_context is SECURITY DEFINER and should not be callable through public RPC roles.
REVOKE EXECUTE ON FUNCTION public.set_tenant_context(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_tenant_context(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_tenant_context(UUID) FROM authenticated;
