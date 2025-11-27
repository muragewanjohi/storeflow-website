-- Add tenant_themes table if it doesn't exist
-- This migration ensures tenant_themes table is created

CREATE TABLE IF NOT EXISTS tenant_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  
  -- Tenant-specific customizations
  custom_colors JSONB DEFAULT '{}',
  custom_fonts JSONB DEFAULT '{}',
  custom_layouts JSONB DEFAULT '{}',
  
  -- Custom CSS (sanitized)
  custom_css TEXT,
  
  -- Logo and branding
  logo_url VARCHAR(500),
  favicon_url VARCHAR(500),
  
  -- SEO metadata
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT,
  
  -- Social media links
  social_links JSONB DEFAULT '{}',
  
  -- Active status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one active theme per tenant (using unique constraint)
  CONSTRAINT unique_tenant_theme UNIQUE(tenant_id, theme_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tenant_themes_tenant_id ON tenant_themes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_themes_theme_id ON tenant_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_tenant_themes_active ON tenant_themes(tenant_id, is_active) WHERE is_active = true;

-- Enable RLS on tenant_themes
ALTER TABLE tenant_themes ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS "tenant_themes_isolation" ON tenant_themes;
CREATE POLICY "tenant_themes_isolation"
  ON tenant_themes FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

