-- New sales default to active so one-product campaigns go live without an
-- extra publish step. Existing rows are left unchanged.
ALTER TABLE public.sales
  ALTER COLUMN status SET DEFAULT 'active';
