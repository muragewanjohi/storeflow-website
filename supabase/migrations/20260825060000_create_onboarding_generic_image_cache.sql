-- DA.24: cache of the 5 generic homepage images (hero/banners/split-layout)
-- generated for the niche-agnostic starter pack path (genericImagesOnly mode,
-- src/app/api/onboarding/starter-pack/route.ts).
--
-- Deliberately a separate table from onboarding_starter_packs, not an
-- extension of it: that cache reuses specific-looking (fake) product photos
-- and intentionally strips reused image URLs (see stripReusedImageUrls in the
-- same route) so competing tenants never render identical "product" photos
-- under different brand names. These 5 images are never product-specific --
-- generic hero/banner/split-layout dressing only -- so reuse across tenants
-- sharing a style (niche, or business type when niche is empty) is safe and
-- expected, the same reasoning Wix/Squarespace/Shopify's Burst library rely
-- on for shared stock/template imagery across unrelated storefronts.
--
-- No tenant_id / tenant-isolation RLS policy: this table is intentionally
-- cross-tenant (that's the whole point of a shared cache), so it's locked to
-- service_role only, same pattern as onboarding_starter_packs
-- (see 015_add_service_role_policies_for_security_advisor.sql) -- Prisma
-- (server-side only) is the only real caller, no anon/authenticated access.

CREATE TABLE public.onboarding_generic_image_cache (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_key        varchar(255) NOT NULL,
  style_raw        varchar(255),
  theme_slug       varchar(100) NOT NULL DEFAULT 'default',
  hero_url         text NOT NULL,
  banner_urls      jsonb NOT NULL DEFAULT '[]'::jsonb,
  split_url        text,
  reuse_count      integer NOT NULL DEFAULT 0,
  source_tenant_id uuid,
  created_at       timestamp DEFAULT now(),
  updated_at       timestamp DEFAULT now(),
  CONSTRAINT idx_generic_image_cache_style_theme UNIQUE (style_key, theme_slug)
);

CREATE INDEX idx_generic_image_cache_style_key ON public.onboarding_generic_image_cache (style_key);

CREATE OR REPLACE FUNCTION public.set_onboarding_generic_image_cache_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.set_onboarding_generic_image_cache_updated_at() SET search_path = public, pg_temp;

CREATE TRIGGER trg_onboarding_generic_image_cache_updated_at
  BEFORE UPDATE ON public.onboarding_generic_image_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.set_onboarding_generic_image_cache_updated_at();

ALTER TABLE public.onboarding_generic_image_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY onboarding_generic_image_cache_service_role_access
  ON public.onboarding_generic_image_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
