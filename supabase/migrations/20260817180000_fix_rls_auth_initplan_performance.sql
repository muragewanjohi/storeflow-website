-- Fix auth_rls_initplan performance advisory (55 policies)
--
-- Every RLS policy calling current_setting('app.current_tenant_id', true),
-- auth.uid(), or auth.role() bare was re-evaluating that call once PER ROW
-- instead of once per query. Wrapping each call in a scalar subquery
-- (select ...) lets Postgres cache the result via its InitPlan mechanism.
--
-- This is a pure performance fix — it does not change what any policy
-- allows or denies. Verified generated from live pg_policies definitions
-- via Supabase MCP, not hand-written from memory. See:
-- https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
--
-- Applied directly to the dukanest project (gtybtfngnggakrsbtrfw) via
-- Supabase MCP apply_migration on 2026-08-17, then backfilled here so the
-- migration history file matches what's actually live.

ALTER POLICY "analytics_events_tenant_isolation" ON public."analytics_events"
  USING ((tenant_id = (NULLIF((select current_setting('app.current_tenant_id'::text, true)), ''::text))::uuid))
  WITH CHECK ((tenant_id = (NULLIF((select current_setting('app.current_tenant_id'::text, true)), ''::text))::uuid));

ALTER POLICY "analytics_page_views_tenant_isolation" ON public."analytics_page_views"
  USING ((tenant_id = (NULLIF((select current_setting('app.current_tenant_id'::text, true)), ''::text))::uuid))
  WITH CHECK ((tenant_id = (NULLIF((select current_setting('app.current_tenant_id'::text, true)), ''::text))::uuid));

ALTER POLICY "analytics_sessions_tenant_isolation" ON public."analytics_sessions"
  USING ((tenant_id = (NULLIF((select current_setting('app.current_tenant_id'::text, true)), ''::text))::uuid))
  WITH CHECK ((tenant_id = (NULLIF((select current_setting('app.current_tenant_id'::text, true)), ''::text))::uuid));

ALTER POLICY "attribute_values_tenant_isolation" ON public."attribute_values"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "attributes_tenant_isolation" ON public."attributes"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "blog_categories_tenant_isolation" ON public."blog_categories"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "blogs_tenant_isolation" ON public."blogs"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "brands_tenant_isolation" ON public."brands"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "cart_items_tenant_isolation" ON public."cart_items"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "categories_tenant_isolation" ON public."categories"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "cities_tenant_isolation" ON public."cities"
  USING (((tenant_id IS NULL) OR (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)));

ALTER POLICY "countries_tenant_isolation" ON public."countries"
  USING (((tenant_id IS NULL) OR (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)));

ALTER POLICY "coupons_tenant_isolation" ON public."coupons"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "customers_tenant_isolation" ON public."customers"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "delivery_zones_tenant_isolation" ON public."delivery_zones"
  USING ((tenant_id = (NULLIF((select current_setting('app.current_tenant_id'::text, true)), ''::text))::uuid))
  WITH CHECK ((tenant_id = (NULLIF((select current_setting('app.current_tenant_id'::text, true)), ''::text))::uuid));

ALTER POLICY "expense_categories_tenant_isolation_delete" ON public."expense_categories"
  USING (((select auth.role()) = 'service_role'::text));

ALTER POLICY "expense_categories_tenant_isolation_insert" ON public."expense_categories"
  WITH CHECK (((select auth.role()) = 'service_role'::text));

ALTER POLICY "expense_categories_tenant_isolation_select" ON public."expense_categories"
  USING (((select auth.role()) = 'service_role'::text));

ALTER POLICY "expense_categories_tenant_isolation_update" ON public."expense_categories"
  USING (((select auth.role()) = 'service_role'::text))
  WITH CHECK (((select auth.role()) = 'service_role'::text));

ALTER POLICY "expenses_tenant_isolation_delete" ON public."expenses"
  USING (((select auth.role()) = 'service_role'::text));

ALTER POLICY "expenses_tenant_isolation_insert" ON public."expenses"
  WITH CHECK (((select auth.role()) = 'service_role'::text));

ALTER POLICY "expenses_tenant_isolation_select" ON public."expenses"
  USING (((select auth.role()) = 'service_role'::text));

ALTER POLICY "expenses_tenant_isolation_update" ON public."expenses"
  USING (((select auth.role()) = 'service_role'::text))
  WITH CHECK (((select auth.role()) = 'service_role'::text));

ALTER POLICY "form_builders_tenant_isolation" ON public."form_builders"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "form_submissions_tenant_isolation" ON public."form_submissions"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "inventory_history_tenant_isolation" ON public."inventory_history"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "landlord_support_ticket_messages_tenant_isolation" ON public."landlord_support_ticket_messages"
  USING ((EXISTS ( SELECT 1
   FROM landlord_support_tickets
  WHERE ((landlord_support_tickets.id = landlord_support_ticket_messages.ticket_id) AND (landlord_support_tickets.tenant_id = (NULLIF((select current_setting('app.current_tenant_id'::text, true)), ''::text))::uuid)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM landlord_support_tickets
  WHERE ((landlord_support_tickets.id = landlord_support_ticket_messages.ticket_id) AND (landlord_support_tickets.tenant_id = (NULLIF((select current_setting('app.current_tenant_id'::text, true)), ''::text))::uuid)))));

ALTER POLICY "landlord_support_tickets_tenant_isolation" ON public."landlord_support_tickets"
  USING ((tenant_id = (NULLIF((select current_setting('app.current_tenant_id'::text, true)), ''::text))::uuid))
  WITH CHECK ((tenant_id = (NULLIF((select current_setting('app.current_tenant_id'::text, true)), ''::text))::uuid));

ALTER POLICY "media_uploads_tenant_isolation" ON public."media_uploads"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "mobile_push_devices_delete_own" ON public."mobile_push_devices"
  USING ((user_id = (select auth.uid())));

ALTER POLICY "mobile_push_devices_insert_own" ON public."mobile_push_devices"
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "mobile_push_devices_select_own" ON public."mobile_push_devices"
  USING ((user_id = (select auth.uid())));

ALTER POLICY "mobile_push_devices_update_own" ON public."mobile_push_devices"
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "order_products_tenant_isolation" ON public."order_products"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "orders_tenant_isolation" ON public."orders"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "pages_tenant_isolation" ON public."pages"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "payment_logs_tenant_isolation" ON public."payment_logs"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "product_categories_tenant_isolation" ON public."product_categories"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "product_reviews_tenant_isolation" ON public."product_reviews"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "product_sales_tenant_isolation" ON public."product_sales"
  USING ((tenant_id = (NULLIF((select current_setting('app.current_tenant_id'::text, true)), ''::text))::uuid))
  WITH CHECK ((tenant_id = (NULLIF((select current_setting('app.current_tenant_id'::text, true)), ''::text))::uuid));

ALTER POLICY "product_variant_attributes_tenant_isolation" ON public."product_variant_attributes"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "product_variants_tenant_isolation" ON public."product_variants"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "product_wishlists_tenant_isolation" ON public."product_wishlists"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "products_tenant_isolation" ON public."products"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "sales_tenant_isolation" ON public."sales"
  USING ((tenant_id = (NULLIF((select current_setting('app.current_tenant_id'::text, true)), ''::text))::uuid))
  WITH CHECK ((tenant_id = (NULLIF((select current_setting('app.current_tenant_id'::text, true)), ''::text))::uuid));

ALTER POLICY "states_tenant_isolation" ON public."states"
  USING (((tenant_id IS NULL) OR (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)));

ALTER POLICY "static_options_tenant_isolation" ON public."static_options"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "support_ticket_messages_tenant_isolation" ON public."support_ticket_messages"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "support_tickets_tenant_isolation" ON public."support_tickets"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "tenant_referrals_tenant_isolation" ON public."tenant_referrals"
  USING ((((select auth.role()) = 'service_role'::text) OR ((select auth.uid()) IN ( SELECT tenants.user_id
   FROM tenants
  WHERE ((tenants.id = tenant_referrals.referrer_tenant_id) OR (tenants.id = tenant_referrals.referred_tenant_id))))))
  WITH CHECK ((((select auth.role()) = 'service_role'::text) OR ((select auth.uid()) IN ( SELECT tenants.user_id
   FROM tenants
  WHERE ((tenants.id = tenant_referrals.referrer_tenant_id) OR (tenants.id = tenant_referrals.referred_tenant_id))))));

ALTER POLICY "tenant_themes_tenant_isolation" ON public."tenant_themes"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "tenant_tumizi_integrations_tenant_isolation" ON public."tenant_tumizi_integrations"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "tumizi_webhook_events_tenant_isolation" ON public."tumizi_webhook_events"
  USING (((tenant_id IS NULL) OR (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)));

ALTER POLICY "user_delivery_addresses_tenant_isolation" ON public."user_delivery_addresses"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));

ALTER POLICY "wallets_tenant_isolation" ON public."wallets"
  USING ((tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid));
