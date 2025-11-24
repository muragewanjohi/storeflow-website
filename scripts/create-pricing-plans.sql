-- Script to create three pricing plans with 14-day trial periods
-- Run this SQL script in your Supabase SQL editor or via psql

-- Basic Plan
INSERT INTO price_plans (name, price, duration_months, trial_days, features, status, created_at, updated_at)
VALUES (
  'Basic Plan',
  29.99,
  1,
  14,
  '{
    "max_products": 100,
    "max_orders": 500,
    "max_storage_mb": 1024,
    "max_customers": 1000,
    "max_pages": 10,
    "max_blogs": 20,
    "max_staff_users": 2
  }'::jsonb,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Pro Plan
INSERT INTO price_plans (name, price, duration_months, trial_days, features, status, created_at, updated_at)
VALUES (
  'Pro Plan',
  79.99,
  1,
  14,
  '{
    "max_products": 1000,
    "max_orders": 5000,
    "max_storage_mb": 10240,
    "max_customers": 10000,
    "max_pages": 50,
    "max_blogs": 100,
    "max_staff_users": 10
  }'::jsonb,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Enterprise Plan
INSERT INTO price_plans (name, price, duration_months, trial_days, features, status, created_at, updated_at)
VALUES (
  'Enterprise Plan',
  199.99,
  1,
  14,
  '{
    "max_products": -1,
    "max_orders": -1,
    "max_storage_mb": 102400,
    "max_customers": -1,
    "max_pages": -1,
    "max_blogs": -1,
    "max_staff_users": -1
  }'::jsonb,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Verify plans were created
SELECT id, name, price, duration_months, trial_days, status 
FROM price_plans 
WHERE name IN ('Basic Plan', 'Pro Plan', 'Enterprise Plan')
ORDER BY price ASC;

