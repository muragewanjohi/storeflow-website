-- Add custom_js field to tenant_themes table
-- Day 36: Advanced theme features - Custom JavaScript injection

ALTER TABLE tenant_themes 
ADD COLUMN IF NOT EXISTS custom_js TEXT;

-- Add comment
COMMENT ON COLUMN tenant_themes.custom_js IS 'Custom JavaScript code for theme customization';

