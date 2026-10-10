-- Optional per-day multipliers. Index 0 is Sunday. Defaults match the weekend multiplier.

ALTER TABLE public.proximity_rate_cards
  ADD COLUMN IF NOT EXISTS day_multipliers jsonb NOT NULL DEFAULT '[1.4, 1, 1, 1, 1, 1, 1.4]'::jsonb;
