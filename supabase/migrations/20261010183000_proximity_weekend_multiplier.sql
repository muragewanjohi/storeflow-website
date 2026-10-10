-- Every Saturday and Sunday uses this multiplier. Stores do not enter weekend dates.

ALTER TABLE public.proximity_rate_cards
  ADD COLUMN IF NOT EXISTS weekend_multiplier numeric(6, 3) NOT NULL DEFAULT 1.4;

ALTER TABLE public.proximity_rate_cards
  DROP CONSTRAINT IF EXISTS proximity_rate_cards_weekend_multiplier_check;

ALTER TABLE public.proximity_rate_cards
  ADD CONSTRAINT proximity_rate_cards_weekend_multiplier_check
  CHECK (weekend_multiplier > 0 AND weekend_multiplier <= 10);
