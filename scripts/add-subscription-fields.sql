-- Migration: Add subscription management fields
-- Run this SQL script to add fields for upgrade/downgrade scheduling and history

-- Add scheduled_plan_id to tenants table for downgrades scheduled for next billing cycle
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS scheduled_plan_id UUID REFERENCES price_plans(id),
ADD COLUMN IF NOT EXISTS scheduled_plan_change_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS upgrade_prorated_amount DECIMAL(10,2);

-- Create subscription_changes table for tracking plan change history
CREATE TABLE IF NOT EXISTS subscription_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_plan_id UUID REFERENCES price_plans(id),
  to_plan_id UUID NOT NULL REFERENCES price_plans(id),
  change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('upgrade', 'downgrade', 'renewal', 'activation')),
  effective_date TIMESTAMP NOT NULL,
  prorated_amount DECIMAL(10,2) DEFAULT 0,
  scheduled_change_date TIMESTAMP, -- For downgrades scheduled for future
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'scheduled', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscription_changes_tenant_id ON subscription_changes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_effective_date ON subscription_changes(effective_date);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_scheduled_date ON subscription_changes(scheduled_change_date);
CREATE INDEX IF NOT EXISTS idx_tenants_scheduled_plan_id ON tenants(scheduled_plan_id);

-- Add comment for documentation
COMMENT ON COLUMN tenants.scheduled_plan_id IS 'Plan ID scheduled to take effect at next billing cycle (for downgrades)';
COMMENT ON COLUMN tenants.scheduled_plan_change_date IS 'Date when scheduled plan change will take effect';
COMMENT ON COLUMN tenants.upgrade_prorated_amount IS 'Prorated amount charged for immediate upgrade';
