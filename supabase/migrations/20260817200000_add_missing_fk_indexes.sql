-- Fix unindexed_foreign_keys performance advisory (11 FK columns)
--
-- Column names verified against pg_constraint/pg_attribute before writing
-- this migration, not inferred from constraint names. A FK column with no
-- covering index forces a sequential scan on the referencing table for
-- every join or cascading delete through it — a structural gap independent
-- of current traffic level, unlike the unused_index findings left alone in
-- this pass (those need real usage data to evaluate safely).
--
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

CREATE INDEX IF NOT EXISTS idx_analytics_events_customer_id ON public.analytics_events (customer_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_order_id ON public.analytics_events (order_id);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_category_id ON public.analytics_page_views (category_id);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_customer_id ON public.analytics_page_views (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_zone_id ON public.orders (delivery_zone_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_attributes_attribute_value_id ON public.product_variant_attributes (attribute_value_id);
CREATE INDEX IF NOT EXISTS idx_product_wishlists_product_id ON public.product_wishlists (product_id);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_from_plan_id ON public.subscription_changes (from_plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_to_plan_id ON public.subscription_changes (to_plan_id);
CREATE INDEX IF NOT EXISTS idx_tenants_plan_id ON public.tenants (plan_id);
