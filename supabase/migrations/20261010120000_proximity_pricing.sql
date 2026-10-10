-- Published proximity rate card: branch multiplier x product-section weekly rate x week index.
-- Booked flights freeze the result on proximity_quote_lines.

ALTER TABLE public.proximity_locations
  ADD COLUMN price_tier varchar(20) NOT NULL DEFAULT 'small',
  ADD COLUMN rate_multiplier numeric(6, 3);

ALTER TABLE public.proximity_locations
  ADD CONSTRAINT proximity_locations_price_tier_check
  CHECK (price_tier IN ('small', 'large'));

ALTER TABLE public.proximity_locations
  ADD CONSTRAINT proximity_locations_rate_multiplier_check
  CHECK (rate_multiplier IS NULL OR (rate_multiplier > 0 AND rate_multiplier <= 10));

ALTER TABLE public.proximity_zones
  ADD COLUMN weekly_rate numeric(12, 2);

ALTER TABLE public.proximity_zones
  ADD CONSTRAINT proximity_zones_weekly_rate_check
  CHECK (weekly_rate IS NULL OR weekly_rate >= 0);

CREATE TABLE public.proximity_rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  default_weekly_rate numeric(12, 2),
  small_multiplier numeric(6, 3) NOT NULL DEFAULT 1,
  large_multiplier numeric(6, 3) NOT NULL DEFAULT 2,
  currency varchar(3) NOT NULL DEFAULT 'KES',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT proximity_rate_cards_default_weekly_rate_check
    CHECK (default_weekly_rate IS NULL OR default_weekly_rate >= 0),
  CONSTRAINT proximity_rate_cards_small_multiplier_check
    CHECK (small_multiplier > 0 AND small_multiplier <= 10),
  CONSTRAINT proximity_rate_cards_large_multiplier_check
    CHECK (large_multiplier > 0 AND large_multiplier <= 10)
);

CREATE TABLE public.proximity_section_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind varchar(40) NOT NULL,
  weekly_rate numeric(12, 2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT proximity_section_rates_weekly_rate_check CHECK (weekly_rate >= 0),
  CONSTRAINT proximity_section_rates_tenant_kind_key UNIQUE (tenant_id, kind)
);

CREATE INDEX idx_proximity_section_rates_tenant ON public.proximity_section_rates (tenant_id);

CREATE TABLE public.proximity_week_indexes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  label varchar(80) NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  multiplier numeric(6, 3) NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT proximity_week_indexes_range_check CHECK (ends_on >= starts_on),
  CONSTRAINT proximity_week_indexes_multiplier_check CHECK (multiplier > 0 AND multiplier <= 10)
);

CREATE INDEX idx_proximity_week_indexes_tenant ON public.proximity_week_indexes (tenant_id, starts_on);

CREATE TABLE public.proximity_quote_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.proximity_campaigns(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.proximity_locations(id) ON DELETE SET NULL,
  zone_id uuid REFERENCES public.proximity_zones(id) ON DELETE SET NULL,
  location_name varchar(255) NOT NULL,
  zone_name varchar(255) NOT NULL,
  weekly_rate numeric(12, 2) NOT NULL,
  branch_multiplier numeric(6, 3) NOT NULL,
  week_index numeric(6, 3) NOT NULL,
  billed_weeks integer NOT NULL,
  line_total numeric(12, 2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT proximity_quote_lines_billed_weeks_check CHECK (billed_weeks >= 1)
);

CREATE INDEX idx_proximity_quote_lines_campaign ON public.proximity_quote_lines (campaign_id);
CREATE INDEX idx_proximity_quote_lines_tenant ON public.proximity_quote_lines (tenant_id);

ALTER TABLE public.proximity_rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_section_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_week_indexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_quote_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proximity_rate_cards_tenant_isolation" ON public.proximity_rate_cards
  USING (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)
  WITH CHECK (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid);

CREATE POLICY "proximity_section_rates_tenant_isolation" ON public.proximity_section_rates
  USING (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)
  WITH CHECK (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid);

CREATE POLICY "proximity_week_indexes_tenant_isolation" ON public.proximity_week_indexes
  USING (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)
  WITH CHECK (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid);

CREATE POLICY "proximity_quote_lines_tenant_isolation" ON public.proximity_quote_lines
  USING (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)
  WITH CHECK (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid);
