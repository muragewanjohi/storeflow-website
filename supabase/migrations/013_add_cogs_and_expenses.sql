-- Add COGS fields and expenses ledger for P&L reporting

ALTER TABLE products
ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2);

ALTER TABLE product_variants
ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2);

ALTER TABLE order_products
ADD COLUMN IF NOT EXISTS unit_cost_at_sale NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS cogs_total NUMERIC(12, 2);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  category VARCHAR(80) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  tax_amount NUMERIC(12, 2) CHECK (tax_amount IS NULL OR tax_amount >= 0),
  payment_method VARCHAR(50),
  reference VARCHAR(255),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id
  ON expenses(tenant_id);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_expense_date
  ON expenses(tenant_id, expense_date);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_category
  ON expenses(tenant_id, category);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY expenses_tenant_isolation_select ON expenses
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY expenses_tenant_isolation_insert ON expenses
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY expenses_tenant_isolation_update ON expenses
  FOR UPDATE USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY expenses_tenant_isolation_delete ON expenses
  FOR DELETE USING (auth.role() = 'service_role');
