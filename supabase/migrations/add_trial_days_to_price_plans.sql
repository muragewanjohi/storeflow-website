-- Migration: Add trial_days column to price_plans table
-- Date: 2024
-- Description: Adds trial_days field to support trial periods for pricing plans

-- Add trial_days column (default 0 = no trial)
ALTER TABLE price_plans 
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN price_plans.trial_days IS 'Trial period in days (0 = no trial)';

