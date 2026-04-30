-- Add tenant-specific expense categories for P&L reporting.

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT expense_categories_tenant_slug_unique UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant_id
  ON expense_categories(tenant_id);

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_category_id
  ON expenses(category_id);

INSERT INTO expense_categories (tenant_id, name, slug, is_default)
SELECT tenants.id, defaults.name, defaults.slug, true
FROM tenants
CROSS JOIN (
  VALUES
    ('Ads & Marketing', 'ads_marketing'),
    ('Shipping & Fulfillment', 'shipping_fulfillment'),
    ('Packaging', 'packaging'),
    ('Software & Apps', 'software_apps'),
    ('Salaries & Contractors', 'salaries_contractors'),
    ('Rent & Utilities', 'rent_utilities'),
    ('Miscellaneous', 'misc')
) AS defaults(name, slug)
ON CONFLICT (tenant_id, slug) DO NOTHING;

UPDATE expenses
SET category_id = expense_categories.id
FROM expense_categories
WHERE expenses.category_id IS NULL
  AND expenses.tenant_id = expense_categories.tenant_id
  AND expenses.category = expense_categories.slug;

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'expense_categories'
      AND policyname = 'expense_categories_tenant_isolation_select'
  ) THEN
    CREATE POLICY expense_categories_tenant_isolation_select ON expense_categories
      FOR SELECT USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'expense_categories'
      AND policyname = 'expense_categories_tenant_isolation_insert'
  ) THEN
    CREATE POLICY expense_categories_tenant_isolation_insert ON expense_categories
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'expense_categories'
      AND policyname = 'expense_categories_tenant_isolation_update'
  ) THEN
    CREATE POLICY expense_categories_tenant_isolation_update ON expense_categories
      FOR UPDATE USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'expense_categories'
      AND policyname = 'expense_categories_tenant_isolation_delete'
  ) THEN
    CREATE POLICY expense_categories_tenant_isolation_delete ON expense_categories
      FOR DELETE USING (auth.role() = 'service_role');
  END IF;
END $$;
