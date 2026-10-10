-- Daily rate for a campaign shorter than one week.
-- Weekend demand stays on the week index, not a third base rate.

ALTER TABLE public.proximity_rate_cards
  ADD COLUMN IF NOT EXISTS default_daily_rate numeric(12, 2);

ALTER TABLE public.proximity_rate_cards
  DROP CONSTRAINT IF EXISTS proximity_rate_cards_default_daily_rate_check;

ALTER TABLE public.proximity_rate_cards
  ADD CONSTRAINT proximity_rate_cards_default_daily_rate_check
  CHECK (default_daily_rate IS NULL OR default_daily_rate >= 0);
