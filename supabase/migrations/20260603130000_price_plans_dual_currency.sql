-- Dual-currency subscription pricing: USD (default) + KES (Kenya)

ALTER TABLE price_plans
  ADD COLUMN IF NOT EXISTS price_kes DECIMAL(10, 2);

COMMENT ON COLUMN price_plans.price IS 'Monthly price in USD (default for non-Kenya tenants and marketing)';
COMMENT ON COLUMN price_plans.price_kes IS 'Monthly price in KES for Kenya tenants; when null, USD price is used';

-- USD defaults: Basic $10, Pro $30
UPDATE price_plans
SET price = 10, updated_at = NOW()
WHERE status = 'active'
  AND (lower(name) = 'basic' OR lower(name) = 'basic plan');

UPDATE price_plans
SET price = 30, updated_at = NOW()
WHERE status = 'active'
  AND (
    lower(name) = 'pro'
    OR lower(name) = 'pro plan'
    OR lower(name) = 'standard'
  );

-- KES defaults: Basic Ksh 1,000, Pro Ksh 3,000 (admin can change)
UPDATE price_plans
SET price_kes = 1000, updated_at = NOW()
WHERE status = 'active'
  AND (lower(name) = 'basic' OR lower(name) = 'basic plan');

UPDATE price_plans
SET price_kes = 3000, updated_at = NOW()
WHERE status = 'active'
  AND (
    lower(name) = 'pro'
    OR lower(name) = 'pro plan'
    OR lower(name) = 'standard'
  );
