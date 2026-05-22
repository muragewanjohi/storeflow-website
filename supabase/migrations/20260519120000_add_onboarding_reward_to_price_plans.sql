-- Migration: Add onboarding reward fields to price_plans
-- Description: Configurable reward checklist window and bonus days per plan (similar to trial_days)

ALTER TABLE price_plans
ADD COLUMN IF NOT EXISTS onboarding_reward_window_days INTEGER DEFAULT 30;

ALTER TABLE price_plans
ADD COLUMN IF NOT EXISTS onboarding_reward_bonus_days INTEGER DEFAULT 30;

COMMENT ON COLUMN price_plans.onboarding_reward_window_days IS 'Days after signup to complete reward checklist (0 = disabled)';
COMMENT ON COLUMN price_plans.onboarding_reward_bonus_days IS 'Bonus subscription days when reward checklist is completed (0 = no bonus)';
