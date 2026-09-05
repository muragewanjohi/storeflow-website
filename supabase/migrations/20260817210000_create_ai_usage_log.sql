-- Create ai_usage_log table (matches prisma/schema.prisma model added in this
-- session's Phase 0 work — see docs/AI_FEATURES_PLAN.md).
--
-- RLS policy is written in the initplan-safe form from the start (select
-- wrapping current_setting()) rather than the bare form we just had to fix
-- on 55 other policies — no point creating new debt we already know about.

CREATE TABLE public.ai_usage_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature        varchar(50) NOT NULL,
  bucket         varchar(20) NOT NULL,
  input_tokens   integer NOT NULL,
  output_tokens  integer NOT NULL,
  estimated_cost numeric(10,6) NOT NULL,
  item_count     integer DEFAULT 1,
  created_at     timestamp DEFAULT now()
);

CREATE INDEX idx_ai_usage_log_tenant_id ON public.ai_usage_log (tenant_id);
CREATE INDEX idx_ai_usage_log_tenant_bucket ON public.ai_usage_log (tenant_id, bucket);
CREATE INDEX idx_ai_usage_log_tenant_feature_created ON public.ai_usage_log (tenant_id, feature, created_at);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_log_tenant_isolation" ON public.ai_usage_log
  USING (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)
  WITH CHECK (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid);
