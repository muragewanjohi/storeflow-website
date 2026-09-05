-- Extends ai_usage_log (20260817210000_create_ai_usage_log.sql) to track
-- Gemini usage alongside the Claude usage it already records — see
-- docs/IMPLEMENTATION_TRACKER.md, DA.16.
--
-- Two changes:
--
-- 1. `provider` distinguishes which AI provider a row belongs to. Defaults
--    to 'claude' so every existing row (and every existing recordAiUsage()
--    call site, none of which pass this yet) keeps its current, correct
--    meaning with zero backfill needed.
--
-- 2. `tenant_id` becomes nullable. Gemini's real call site (the onboarding
--    Store Starter Pack, src/app/api/onboarding/starter-pack/route.ts) is
--    genuinely called BEFORE a tenant row exists in the most common real
--    path (src/app/api/onboarding/starter-pack-jobs/route.ts's job schema
--    has no tenantId field at all — this happens pre-registration). A
--    NOT NULL tenant_id would make that entire cost surface unloggable,
--    which is exactly the opposite of what usage tracking is for. Every
--    Claude call site always has a real tenant by the time it runs, so
--    this is additive, not a behavior change for existing rows.
--
-- RLS is unaffected: the existing tenant-isolation policy compares
-- tenant_id to the current session's tenant setting, which a NULL row can
-- never match — correct, since anonymous/pre-tenant usage shouldn't be
-- visible through any tenant-scoped lens. Prisma (the only writer/reader
-- today, including the new admin AI Usage page) connects with a role that
-- bypasses RLS, same as every other table this session's work has touched.

ALTER TABLE public.ai_usage_log
  ALTER COLUMN tenant_id DROP NOT NULL;

ALTER TABLE public.ai_usage_log
  ADD COLUMN provider varchar(20) NOT NULL DEFAULT 'claude';

CREATE INDEX idx_ai_usage_log_provider_created ON public.ai_usage_log (provider, created_at);
