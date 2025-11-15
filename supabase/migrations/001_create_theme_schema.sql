-- Theme Architecture: Component-Based Themes
-- Migration: Create theme tables for multi-tenant theme system

-- ============================================
-- 1. CENTRAL THEMES TABLE (No tenant_id)
-- ============================================
CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,  -- Note: Using 'title' to match actual schema
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  author VARCHAR(255) DEFAULT 'StoreFlow',
  version VARCHAR(50) DEFAULT '1.0.0',
  status BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  price DECIMAL(10,2),
  unique_key VARCHAR(255) UNIQUE,  -- Matches actual schema
  theme_url VARCHAR(500),  -- Matches actual schema (was preview_url)
  screenshot_url VARCHAR(500),
  -- Note: demo_url removed, not in actual schema
  
  -- Theme configuration as JSON
  config JSONB DEFAULT '{}',
  
  -- Note: customization_schema and layouts removed, not in actual schema
  
  -- Default color palette
  colors JSONB DEFAULT '{}',
  
  -- Typography settings
  typography JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for themes
CREATE INDEX IF NOT EXISTS idx_themes_slug ON themes(slug);
CREATE INDEX IF NOT EXISTS idx_themes_status ON themes(status);
CREATE INDEX IF NOT EXISTS idx_themes_premium ON themes(is_premium);

-- ============================================
-- 2. TENANT THEME SELECTION & CUSTOMIZATION
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id),
  
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
  
  -- Ensure one active theme per tenant
  CONSTRAINT unique_tenant_active_theme UNIQUE(tenant_id, is_active) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Indexes for tenant_themes
CREATE INDEX IF NOT EXISTS idx_tenant_themes_tenant_id ON tenant_themes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_themes_theme_id ON tenant_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_tenant_themes_active ON tenant_themes(tenant_id, is_active);

-- Enable RLS on tenant_themes
ALTER TABLE tenant_themes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenants can only see/modify their own theme
DROP POLICY IF EXISTS "tenant_themes_isolation" ON tenant_themes;
CREATE POLICY "tenant_themes_isolation"
  ON tenant_themes FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================
-- 3. THEME COMPONENTS LIBRARY
-- ============================================
CREATE TABLE IF NOT EXISTS theme_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  category VARCHAR(100), -- 'header', 'footer', 'hero', 'product-grid', etc.
  
  -- Component configuration
  config JSONB DEFAULT '{}',
  
  -- Preview
  preview_url VARCHAR(500),
  
  -- Order for display
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(theme_id, slug)
);

-- Indexes for theme_components
CREATE INDEX IF NOT EXISTS idx_theme_components_theme_id ON theme_components(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_components_category ON theme_components(category);

-- ============================================
-- 4. TENANT PAGE LAYOUTS (Page Builder)
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_page_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page_type VARCHAR(100) NOT NULL, -- 'home', 'shop', 'product', 'about', etc.
  
  -- Array of component configurations
  components JSONB DEFAULT '[]',
  
  -- SEO for this page
  seo_settings JSONB DEFAULT '{}',
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, page_type)
);

-- Indexes for tenant_page_layouts
CREATE INDEX IF NOT EXISTS idx_tenant_page_layouts_tenant_id ON tenant_page_layouts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_page_layouts_page_type ON tenant_page_layouts(page_type);

-- Enable RLS on tenant_page_layouts
ALTER TABLE tenant_page_layouts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenants can only see/modify their own layouts
DROP POLICY IF EXISTS "tenant_page_layouts_isolation" ON tenant_page_layouts;
CREATE POLICY "tenant_page_layouts_isolation"
  ON tenant_page_layouts FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================
-- 5. HELPER FUNCTION: Set tenant context
-- ============================================
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. SEED DEFAULT THEMES (only if they don't exist)
-- ============================================
-- Note: Using actual column names from database schema (title, not name)
INSERT INTO themes (title, slug, description, status, colors, typography, config, author, version) 
SELECT * FROM (VALUES
(
  'HexFashion',
  'hexfashion',
  'Modern fashion ecommerce theme with clean design',
  true,
  '{
    "primary": "#FF6B6B",
    "secondary": "#4ECDC4",
    "accent": "#FFE66D",
    "background": "#FFFFFF",
    "text": "#2D3748",
    "muted": "#718096"
  }'::jsonb,
  '{
    "headingFont": "Poppins",
    "bodyFont": "Inter",
    "baseFontSize": 16
  }'::jsonb,
  '{
    "layout": {
      "header": "sticky",
      "footer": "multi-column"
    },
    "features": {
      "megaMenu": true,
      "quickView": true,
      "wishlist": true,
      "compareProducts": true
    }
  }'::jsonb,
  'StoreFlow',
  '1.0.0'
),
(
  'Aromatic',
  'aromatic',
  'Elegant theme perfect for perfume and beauty stores',
  true,
  '{
    "primary": "#8B5CF6",
    "secondary": "#EC4899",
    "accent": "#F59E0B",
    "background": "#FFFFFF",
    "text": "#1F2937",
    "muted": "#6B7280"
  }'::jsonb,
  '{
    "headingFont": "Playfair Display",
    "bodyFont": "Lato",
    "baseFontSize": 16
  }'::jsonb,
  '{
    "layout": {
      "header": "sticky",
      "footer": "multi-column"
    },
    "features": {
      "megaMenu": true,
      "quickView": true,
      "wishlist": true,
      "compareProducts": false
    }
  }'::jsonb,
  'StoreFlow',
  '1.0.0'
),
(
  'BookPoint',
  'bookpoint',
  'Perfect theme for bookstores and digital products',
  true,
  '{
    "primary": "#3B82F6",
    "secondary": "#10B981",
    "accent": "#F59E0B",
    "background": "#FFFFFF",
    "text": "#111827",
    "muted": "#6B7280"
  }'::jsonb,
  '{
    "headingFont": "Merriweather",
    "bodyFont": "Open Sans",
    "baseFontSize": 16
  }'::jsonb,
  '{
    "layout": {
      "header": "sticky",
      "footer": "simple"
    },
    "features": {
      "megaMenu": false,
      "quickView": true,
      "wishlist": true,
      "compareProducts": false
    }
  }'::jsonb,
  'StoreFlow',
  '1.0.0'
)) AS v(title, slug, description, status, colors, typography, config, author, version)
WHERE NOT EXISTS (SELECT 1 FROM themes WHERE themes.slug = v.slug);

-- ============================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE themes IS 'Central theme registry - available themes for all tenants';
COMMENT ON TABLE tenant_themes IS 'Tenant theme selection and customizations (tenant-scoped)';
COMMENT ON TABLE theme_components IS 'Component library for themes (header, footer, hero sections, etc.)';
COMMENT ON TABLE tenant_page_layouts IS 'Tenant-specific page layouts using page builder components';

