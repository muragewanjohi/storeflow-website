/**
 * Add Full-Text Search Support for Products
 * 
 * Adds tsvector columns and GIN indexes for fast full-text search
 * 
 * Day 30: Tenant Storefront - Improved Search
 */

-- Add tsvector column for full-text search
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search_vector
CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.sku, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search_vector
DROP TRIGGER IF EXISTS products_search_vector_trigger ON products;
CREATE TRIGGER products_search_vector_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION products_search_vector_update();

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_products_search_vector 
ON products USING GIN(search_vector);

-- Update existing products to populate search_vector
UPDATE products 
SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(sku, '')), 'A')
WHERE search_vector IS NULL;

