-- Phase 2: dayparts, bilingual A/B copy, branch geofence, cashier redeem.
-- SQL-first. Regenerate the Prisma client after applying.

ALTER TABLE public.proximity_locations
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS geofence_radius_m integer NOT NULL DEFAULT 150;

ALTER TABLE public.proximity_campaigns
  ADD COLUMN IF NOT EXISTS purpose varchar(20) NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS days_of_week varchar(7) NOT NULL DEFAULT '0123456',
  ADD COLUMN IF NOT EXISTS headline_sw varchar(255),
  ADD COLUMN IF NOT EXISTS body_sw text,
  ADD COLUMN IF NOT EXISTS headline_b varchar(255),
  ADD COLUMN IF NOT EXISTS body_b text,
  ADD COLUMN IF NOT EXISTS headline_b_sw varchar(255),
  ADD COLUMN IF NOT EXISTS body_b_sw text;

ALTER TABLE public.proximity_claims
  ADD COLUMN IF NOT EXISTS redeemed_at timestamptz,
  ADD COLUMN IF NOT EXISTS redeemed_note varchar(255);
