-- Seed default themes
-- This migration creates three default themes: Default, Minimal, and Modern
-- Run this via: npx supabase migration up
-- Or manually in Supabase SQL Editor

-- Insert Default Theme
INSERT INTO themes (title, slug, description, author, version, status, is_premium, unique_key, colors, typography, config)
VALUES (
  'Default Theme',
  'default',
  'A clean and professional default theme perfect for any store',
  'StoreFlow',
  '1.0.0',
  true,
  false,
  'default-theme-v1',
  '{"primary": "#3b82f6", "secondary": "#8b5cf6", "accent": "#10b981", "background": "#ffffff", "text": "#1f2937", "muted": "#6b7280"}'::jsonb,
  '{"headingFont": "Inter", "bodyFont": "Inter", "baseFontSize": 16, "headingWeight": 700, "bodyWeight": 400}'::jsonb,
  '{"features": {"megaMenu": true, "quickView": true, "wishlist": true, "compareProducts": false, "ajaxSearch": true, "stickyCart": true}}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Insert Minimal Theme
INSERT INTO themes (title, slug, description, author, version, status, is_premium, unique_key, colors, typography, config)
VALUES (
  'Minimal Theme',
  'minimal',
  'A minimal and elegant theme with clean lines and simple design',
  'StoreFlow',
  '1.0.0',
  true,
  false,
  'minimal-theme-v1',
  '{"primary": "#000000", "secondary": "#6b7280", "accent": "#000000", "background": "#ffffff", "text": "#1f2937", "muted": "#9ca3af"}'::jsonb,
  '{"headingFont": "Inter", "bodyFont": "Inter", "baseFontSize": 16, "headingWeight": 600, "bodyWeight": 400}'::jsonb,
  '{"features": {"megaMenu": false, "quickView": false, "wishlist": true, "compareProducts": false, "ajaxSearch": false, "stickyCart": false}}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Insert Modern Theme
INSERT INTO themes (title, slug, description, author, version, status, is_premium, unique_key, colors, typography, config)
VALUES (
  'Modern Theme',
  'modern',
  'A modern theme with bold colors and contemporary design',
  'StoreFlow',
  '1.0.0',
  true,
  false,
  'modern-theme-v1',
  '{"primary": "#ec4899", "secondary": "#8b5cf6", "accent": "#f59e0b", "background": "#f9fafb", "text": "#111827", "muted": "#6b7280"}'::jsonb,
  '{"headingFont": "Poppins", "bodyFont": "Inter", "baseFontSize": 16, "headingWeight": 700, "bodyWeight": 400}'::jsonb,
  '{"features": {"megaMenu": true, "quickView": true, "wishlist": true, "compareProducts": true, "ajaxSearch": true, "stickyCart": true}}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

