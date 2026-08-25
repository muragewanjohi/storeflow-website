-- DA.26: platform-wide, landlord-editable key/value settings.
--
-- No prior mechanism for this existed: static_options (src/lib/settings/
-- static-options.ts) is per-tenant, and admin/settings/page.tsx was
-- purely read-only (stats + env-var presence checks). This table is the
-- first genuinely platform-wide, cross-tenant admin-editable config store.
--
-- First real use: the DA.24 starter-pack generic-image reuse cap
-- (GENERIC_IMAGE_CACHE_REUSE_CAP, previously a hardcoded constant in
-- src/app/api/onboarding/starter-pack/route.ts) — requested directly by the
-- user ("make it an editable configuration on admin dashboard") after it
-- was flagged as a one-line constant needing a code change to tune.
--
-- Values are stored as text (not typed columns) since this is a generic
-- key/value store meant to grow — callers parse/validate to their own
-- expected type (see src/lib/settings/platform-settings.ts). Locked to
-- service_role only, same reasoning as onboarding_generic_image_cache
-- (DA.24) and onboarding_starter_packs — no anon/authenticated RLS policy;
-- only server-side landlord-authenticated admin routes should ever touch
-- this, and Prisma (server-side only) bypasses RLS anyway.

CREATE TABLE public.platform_settings (
  key         varchar(100) PRIMARY KEY,
  value       text NOT NULL,
  description text,
  updated_at  timestamp DEFAULT now(),
  -- Informational only, no FK -- same "don't couple to another schema for
  -- an audit-only field" reasoning as onboarding_generic_image_cache's
  -- source_tenant_id (DA.24).
  updated_by  uuid
);

CREATE OR REPLACE FUNCTION public.set_platform_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.set_platform_settings_updated_at() SET search_path = public, pg_temp;

CREATE TRIGGER trg_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_platform_settings_updated_at();

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_settings_service_role_access
  ON public.platform_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
