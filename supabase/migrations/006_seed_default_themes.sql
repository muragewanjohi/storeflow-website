-- Seed default themes
-- This migration creates three default themes: Default, Minimal, and Modern
-- Run this via: npx supabase migration up
-- Or manually in Supabase SQL Editor

-- Insert Default Theme
INSERT INTO themes (title, slug, description, author, version, status, is_premium, unique_key, screenshot_url, colors, typography, config)
VALUES (
  'Default Theme',
  'default',
  'A clean and professional default theme perfect for any store',
  'StoreFlow',
  '1.0.0',
  true,
  false,
  'default-theme-v1',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=800&fit=crop',
  '{"primary": "#3b82f6", "secondary": "#8b5cf6", "accent": "#10b981", "background": "#ffffff", "text": "#1f2937", "muted": "#6b7280"}'::jsonb,
  '{"headingFont": "Inter", "bodyFont": "Inter", "baseFontSize": 16, "headingWeight": 700, "bodyWeight": 400}'::jsonb,
  '{"features": {"megaMenu": true, "quickView": true, "wishlist": true, "compareProducts": false, "ajaxSearch": true, "stickyCart": true}}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET screenshot_url = EXCLUDED.screenshot_url;

-- Insert Minimal Theme
INSERT INTO themes (title, slug, description, author, version, status, is_premium, unique_key, screenshot_url, colors, typography, config)
VALUES (
  'Minimal Theme',
  'minimal',
  'A minimal and elegant theme with clean lines and simple design',
  'StoreFlow',
  '1.0.0',
  true,
  false,
  'minimal-theme-v1',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=800&fit=crop',
  '{"primary": "#000000", "secondary": "#6b7280", "accent": "#000000", "background": "#ffffff", "text": "#1f2937", "muted": "#9ca3af"}'::jsonb,
  '{"headingFont": "Inter", "bodyFont": "Inter", "baseFontSize": 16, "headingWeight": 600, "bodyWeight": 400}'::jsonb,
  '{"features": {"megaMenu": false, "quickView": false, "wishlist": true, "compareProducts": false, "ajaxSearch": false, "stickyCart": false}}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET screenshot_url = EXCLUDED.screenshot_url;

-- Insert Modern Theme
INSERT INTO themes (title, slug, description, author, version, status, is_premium, unique_key, screenshot_url, colors, typography, config)
VALUES (
  'Modern Theme',
  'modern',
  'A modern theme with bold colors and contemporary design',
  'StoreFlow',
  '1.0.0',
  true,
  false,
  'modern-theme-v1',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop',
  '{"primary": "#ec4899", "secondary": "#8b5cf6", "accent": "#f59e0b", "background": "#f9fafb", "text": "#111827", "muted": "#6b7280"}'::jsonb,
  '{"headingFont": "Poppins", "bodyFont": "Inter", "baseFontSize": 16, "headingWeight": 700, "bodyWeight": 400}'::jsonb,
  '{"features": {"megaMenu": true, "quickView": true, "wishlist": true, "compareProducts": true, "ajaxSearch": true, "stickyCart": true}}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET screenshot_url = EXCLUDED.screenshot_url;

-- Insert HexFashion Theme (if not exists)
INSERT INTO themes (title, slug, description, author, version, status, is_premium, unique_key, screenshot_url, colors, typography, config)
VALUES (
  'HexFashion Theme',
  'hexfashion',
  'Elegant fashion theme with catalog-style layouts',
  'StoreFlow',
  '1.0.0',
  true,
  false,
  'hexfashion-theme-v1',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=800&fit=crop',
  '{"primary": "#000000", "secondary": "#ffffff", "accent": "#d4af37", "background": "#ffffff", "text": "#1a1a1a", "muted": "#666666"}'::jsonb,
  '{"headingFont": "Playfair Display", "bodyFont": "Lato", "baseFontSize": 16, "headingWeight": 700, "bodyWeight": 400}'::jsonb,
  '{"features": {"megaMenu": false, "quickView": true, "wishlist": true, "compareProducts": false, "ajaxSearch": true, "stickyCart": true}}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET screenshot_url = EXCLUDED.screenshot_url;

