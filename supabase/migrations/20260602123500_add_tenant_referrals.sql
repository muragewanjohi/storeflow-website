-- Referral loyalty program: tenant-to-tenant referral attribution and reward tracking

CREATE TABLE IF NOT EXISTS tenant_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  referred_tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  referral_identifier VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  qualified_at TIMESTAMP,
  rewarded_at TIMESTAMP,
  reward_months INTEGER DEFAULT 1,
  rejection_reason VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_referrals_referrer
  ON tenant_referrals(referrer_tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_referrals_status
  ON tenant_referrals(status);
CREATE INDEX IF NOT EXISTS idx_tenant_referrals_created_at
  ON tenant_referrals(created_at);

ALTER TABLE tenant_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_referrals_tenant_isolation ON tenant_referrals;
CREATE POLICY tenant_referrals_tenant_isolation
  ON tenant_referrals
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth.uid()::uuid IN (
      SELECT user_id FROM tenants
      WHERE id = referrer_tenant_id
        OR id = referred_tenant_id
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth.uid()::uuid IN (
      SELECT user_id FROM tenants
      WHERE id = referrer_tenant_id
        OR id = referred_tenant_id
    )
  );
