-- Seed Grocery Theme
-- This migration creates the Grocery theme for organic food stores
-- Run this via: npx supabase migration up
-- Or manually in Supabase SQL Editor

-- Insert Grocery Theme
INSERT INTO themes (title, slug, description, author, version, status, is_premium, unique_key, screenshot_url, colors, typography, config)
VALUES (
  'Grocery Theme',
  'grocery',
  'Fresh and organic grocery theme perfect for food stores, farmers markets, and organic food retailers',
  'StoreFlow',
  '1.0.0',
  true,
  false,
  'grocery-theme-v1',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=800&fit=crop',
  '{"primary": "#16a34a", "secondary": "#10b981", "accent": "#059669", "background": "#ffffff", "text": "#1f2937", "muted": "#6b7280"}'::jsonb,
  '{"headingFont": "Inter", "bodyFont": "Inter", "baseFontSize": 16, "headingWeight": 700, "bodyWeight": 400}'::jsonb,
  '{"features": {"megaMenu": false, "quickView": true, "wishlist": true, "compareProducts": false, "ajaxSearch": true, "stickyCart": true}}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET 
  screenshot_url = EXCLUDED.screenshot_url,
  colors = EXCLUDED.colors,
  typography = EXCLUDED.typography,
  config = EXCLUDED.config,
  updated_at = now();
