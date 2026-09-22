-- Product image URLs from Supabase Storage often exceed VARCHAR(255).
-- Keep the full URL so list/edit can load photos added during onboarding.
ALTER TABLE products
  ALTER COLUMN image TYPE TEXT;

COMMENT ON COLUMN products.image IS
  'Primary product image URL (full public storage URL). Gallery JSON may also hold copies.';
