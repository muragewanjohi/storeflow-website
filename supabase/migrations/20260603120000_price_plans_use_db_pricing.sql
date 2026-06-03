-- Sync Basic / Pro monthly prices for admin-managed subscription pricing.
-- Adjust amounts here or via Admin → Price Plans after deploy.

UPDATE price_plans
SET price = 10, updated_at = NOW()
WHERE status = 'active'
  AND (lower(name) = 'basic' OR lower(name) = 'basic plan');

UPDATE price_plans
SET price = 3000, updated_at = NOW()
WHERE status = 'active'
  AND (
    lower(name) = 'pro'
    OR lower(name) = 'pro plan'
    OR lower(name) = 'standard'
  );
