-- Phase 1 proximity / in-store vendor ads.
-- SQL-first (see CLAUDE.md). Prisma generate after this file.
-- RLS uses initplan-safe current_setting (see 20260817180000).

CREATE TABLE public.proximity_locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        varchar(255) NOT NULL,
  slug        varchar(120) NOT NULL,
  address     text,
  timezone    varchar(64) NOT NULL DEFAULT 'Africa/Nairobi',
  status      varchar(20) NOT NULL DEFAULT 'active',
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE public.proximity_zones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL REFERENCES public.proximity_locations(id) ON DELETE CASCADE,
  name         varchar(255) NOT NULL,
  slug         varchar(120) NOT NULL,
  kind         varchar(40) NOT NULL DEFAULT 'department',
  status       varchar(20) NOT NULL DEFAULT 'active',
  metadata     jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (location_id, slug)
);

CREATE TABLE public.proximity_beacons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id     uuid NOT NULL REFERENCES public.proximity_locations(id) ON DELETE CASCADE,
  zone_id         uuid NOT NULL REFERENCES public.proximity_zones(id) ON DELETE CASCADE,
  name            varchar(255),
  mac_address     varchar(32),
  qr_code         varchar(128),
  ibeacon_uuid    varchar(36) NOT NULL DEFAULT '6e8a4c12-9f3d-4b71-a2e8-1d7c0b5e4a91',
  major           integer NOT NULL,
  minor           integer NOT NULL,
  tx_power_dbm    numeric(4,1) NOT NULL DEFAULT -13.5,
  adv_interval_ms integer NOT NULL DEFAULT 500,
  status          varchar(20) NOT NULL DEFAULT 'active',
  last_seen_at    timestamptz,
  battery_mv      integer,
  installed_at    timestamptz,
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (tenant_id, ibeacon_uuid, major, minor),
  UNIQUE (tenant_id, mac_address)
);

CREATE TABLE public.proximity_advertisers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name               varchar(255) NOT NULL,
  email              varchar(255),
  phone              varchar(40),
  access_token_hash  varchar(128),
  status             varchar(20) NOT NULL DEFAULT 'active',
  notes              text,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE TABLE public.proximity_sdk_apps (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name         varchar(255) NOT NULL,
  flavor       varchar(20) NOT NULL, -- scan | commission
  key_prefix   varchar(24) NOT NULL,
  key_hash     varchar(128) NOT NULL,
  status       varchar(20) NOT NULL DEFAULT 'active',
  last_used_at timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (key_prefix)
);

CREATE TABLE public.proximity_campaigns (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  advertiser_id           uuid REFERENCES public.proximity_advertisers(id) ON DELETE SET NULL,
  name                    varchar(255) NOT NULL,
  headline                varchar(255) NOT NULL,
  body                    text,
  image_url               varchar(500),
  cta_label               varchar(80) DEFAULT 'View offer',
  cta_url                 varchar(500),
  coupon_enabled          boolean NOT NULL DEFAULT false,
  coupon_label            varchar(120),
  coupon_discount_type    varchar(20),
  coupon_discount_value   numeric(10,2),
  starts_at               timestamptz NOT NULL,
  ends_at                 timestamptz NOT NULL,
  timezone                varchar(64) NOT NULL DEFAULT 'Africa/Nairobi',
  trading_hours_start     time,
  trading_hours_end       time,
  frequency_cap_per_day   integer NOT NULL DEFAULT 1,
  visit_storm_cap         integer NOT NULL DEFAULT 3,
  dwell_ms                integer NOT NULL DEFAULT 2500,
  priority                integer NOT NULL DEFAULT 40,
  brand_safety_category   varchar(80),
  status                  varchar(20) NOT NULL DEFAULT 'draft',
  rejection_reason        text,
  fee_amount              numeric(12,2),
  supermarket_share_pct   numeric(5,2) NOT NULL DEFAULT 70,
  billing_paused          boolean NOT NULL DEFAULT false,
  terms_accepted_at       timestamptz,
  metadata                jsonb DEFAULT '{}'::jsonb,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

CREATE TABLE public.proximity_campaign_placements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id  uuid NOT NULL REFERENCES public.proximity_campaigns(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL REFERENCES public.proximity_locations(id) ON DELETE CASCADE,
  zone_id      uuid NOT NULL REFERENCES public.proximity_zones(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (campaign_id, location_id, zone_id)
);

CREATE TABLE public.proximity_events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id          uuid REFERENCES public.proximity_campaigns(id) ON DELETE SET NULL,
  location_id          uuid REFERENCES public.proximity_locations(id) ON DELETE SET NULL,
  zone_id              uuid REFERENCES public.proximity_zones(id) ON DELETE SET NULL,
  beacon_id            uuid REFERENCES public.proximity_beacons(id) ON DELETE SET NULL,
  opaque_customer_id   varchar(128) NOT NULL,
  visit_id             varchar(64),
  event_type           varchar(20) NOT NULL,
  source               varchar(10) NOT NULL DEFAULT 'ble', -- ble | qr
  consent              boolean NOT NULL DEFAULT false,
  impression_on_screen boolean NOT NULL DEFAULT false,
  metadata             jsonb DEFAULT '{}'::jsonb,
  created_at           timestamptz DEFAULT now()
);

CREATE TABLE public.proximity_claims (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id         uuid NOT NULL REFERENCES public.proximity_campaigns(id) ON DELETE CASCADE,
  opaque_customer_id  varchar(128) NOT NULL,
  code                varchar(40) NOT NULL,
  expires_at          timestamptz NOT NULL,
  claimed_at          timestamptz DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE public.proximity_invoices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id         uuid REFERENCES public.proximity_campaigns(id) ON DELETE SET NULL,
  advertiser_id       uuid REFERENCES public.proximity_advertisers(id) ON DELETE SET NULL,
  amount              numeric(12,2) NOT NULL,
  supermarket_share   numeric(12,2) NOT NULL,
  dukanest_share      numeric(12,2) NOT NULL,
  status              varchar(20) NOT NULL DEFAULT 'draft', -- draft | sent | paid
  notes               text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_proximity_locations_tenant ON public.proximity_locations (tenant_id);
CREATE INDEX idx_proximity_zones_tenant_location ON public.proximity_zones (tenant_id, location_id);
CREATE INDEX idx_proximity_beacons_tenant_zone ON public.proximity_beacons (tenant_id, zone_id);
CREATE INDEX idx_proximity_beacons_uuid_major_minor ON public.proximity_beacons (ibeacon_uuid, major, minor);
CREATE INDEX idx_proximity_beacons_last_seen ON public.proximity_beacons (tenant_id, last_seen_at);
CREATE INDEX idx_proximity_advertisers_tenant ON public.proximity_advertisers (tenant_id);
CREATE INDEX idx_proximity_sdk_apps_tenant ON public.proximity_sdk_apps (tenant_id, flavor);
CREATE INDEX idx_proximity_campaigns_tenant_status ON public.proximity_campaigns (tenant_id, status);
CREATE INDEX idx_proximity_campaigns_advertiser ON public.proximity_campaigns (advertiser_id);
CREATE INDEX idx_proximity_campaigns_window ON public.proximity_campaigns (tenant_id, starts_at, ends_at);
CREATE INDEX idx_proximity_placements_zone ON public.proximity_campaign_placements (tenant_id, location_id, zone_id);
CREATE INDEX idx_proximity_events_tenant_created ON public.proximity_events (tenant_id, created_at);
CREATE INDEX idx_proximity_events_campaign_type ON public.proximity_events (campaign_id, event_type);
CREATE INDEX idx_proximity_events_customer_day ON public.proximity_events (tenant_id, opaque_customer_id, event_type, created_at);
CREATE INDEX idx_proximity_claims_campaign ON public.proximity_claims (campaign_id, opaque_customer_id);

ALTER TABLE public.proximity_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_beacons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_sdk_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_campaign_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proximity_locations_tenant_isolation" ON public.proximity_locations
  USING (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)
  WITH CHECK (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid);

CREATE POLICY "proximity_zones_tenant_isolation" ON public.proximity_zones
  USING (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)
  WITH CHECK (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid);

CREATE POLICY "proximity_beacons_tenant_isolation" ON public.proximity_beacons
  USING (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)
  WITH CHECK (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid);

CREATE POLICY "proximity_advertisers_tenant_isolation" ON public.proximity_advertisers
  USING (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)
  WITH CHECK (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid);

CREATE POLICY "proximity_sdk_apps_tenant_isolation" ON public.proximity_sdk_apps
  USING (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)
  WITH CHECK (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid);

CREATE POLICY "proximity_campaigns_tenant_isolation" ON public.proximity_campaigns
  USING (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)
  WITH CHECK (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid);

CREATE POLICY "proximity_campaign_placements_tenant_isolation" ON public.proximity_campaign_placements
  USING (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)
  WITH CHECK (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid);

CREATE POLICY "proximity_events_tenant_isolation" ON public.proximity_events
  USING (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)
  WITH CHECK (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid);

CREATE POLICY "proximity_claims_tenant_isolation" ON public.proximity_claims
  USING (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)
  WITH CHECK (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid);

CREATE POLICY "proximity_invoices_tenant_isolation" ON public.proximity_invoices
  USING (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid)
  WITH CHECK (tenant_id = ((select current_setting('app.current_tenant_id'::text, true)))::uuid);
