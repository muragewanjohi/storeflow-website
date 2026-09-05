-- ============================================
-- Add Tumizi integration and webhook audit tables
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_tumizi_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  merchant_external_id VARCHAR(120),
  wallet_account_number VARCHAR(120),
  wallet_currency VARCHAR(10),
  webhook_url VARCHAR(500),
  webhook_events JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_tumizi_integrations_tenant_unique
  ON tenant_tumizi_integrations(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_tumizi_integrations_merchant_external_unique
  ON tenant_tumizi_integrations(merchant_external_id)
  WHERE merchant_external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_tumizi_integrations_enabled
  ON tenant_tumizi_integrations(enabled);
CREATE INDEX IF NOT EXISTS idx_tenant_tumizi_integrations_tenant_id
  ON tenant_tumizi_integrations(tenant_id);

CREATE TABLE IF NOT EXISTS tumizi_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  event_name VARCHAR(120) NOT NULL,
  external_reference VARCHAR(255),
  merchant_external_id VARCHAR(120),
  payload JSONB NOT NULL,
  processing_status VARCHAR(40) NOT NULL DEFAULT 'received',
  processing_error TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tumizi_webhook_events_name_ref_unique
  ON tumizi_webhook_events(event_name, external_reference)
  WHERE external_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tumizi_webhook_events_tenant_id
  ON tumizi_webhook_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tumizi_webhook_events_event_name
  ON tumizi_webhook_events(event_name);
CREATE INDEX IF NOT EXISTS idx_tumizi_webhook_events_processing_status
  ON tumizi_webhook_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_tumizi_webhook_events_merchant_external_id
  ON tumizi_webhook_events(merchant_external_id);

-- Enable RLS for tenant-scoped Tumizi tables.
ALTER TABLE tenant_tumizi_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tumizi_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_tumizi_integrations_tenant_isolation" ON tenant_tumizi_integrations;
CREATE POLICY "tenant_tumizi_integrations_tenant_isolation"
  ON tenant_tumizi_integrations
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS "tumizi_webhook_events_tenant_isolation" ON tumizi_webhook_events;
CREATE POLICY "tumizi_webhook_events_tenant_isolation"
  ON tumizi_webhook_events
  FOR ALL
  USING (
    tenant_id IS NULL
    OR tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Backfill from tenants.data JSON config if present.
INSERT INTO tenant_tumizi_integrations (
  tenant_id,
  enabled,
  merchant_external_id,
  wallet_account_number,
  wallet_currency,
  metadata
)
SELECT
  t.id,
  COALESCE((t.data->'tumizi'->>'enabled')::boolean, false),
  NULLIF(t.data->'tumizi'->>'merchantExternalId', ''),
  NULLIF(t.data->'tumizi'->>'walletAccountNumber', ''),
  NULLIF(t.data->'tumizi'->>'walletCurrency', ''),
  jsonb_build_object(
    'source', 'legacy_json',
    'lastSyncedAt', t.data->'tumizi'->>'lastSyncedAt'
  )
FROM tenants t
WHERE t.data ? 'tumizi'
ON CONFLICT (tenant_id) DO UPDATE
SET
  enabled = EXCLUDED.enabled,
  merchant_external_id = COALESCE(EXCLUDED.merchant_external_id, tenant_tumizi_integrations.merchant_external_id),
  wallet_account_number = COALESCE(EXCLUDED.wallet_account_number, tenant_tumizi_integrations.wallet_account_number),
  wallet_currency = COALESCE(EXCLUDED.wallet_currency, tenant_tumizi_integrations.wallet_currency),
  metadata = COALESCE(tenant_tumizi_integrations.metadata, '{}'::jsonb) || EXCLUDED.metadata,
  updated_at = now();
