/**
 * Fix Products Search Vector Trigger
 * 
 * This SQL script fixes the trigger function to ensure it uses NEW (uppercase)
 * correctly and handles edge cases
 * 
 * Run this in your Supabase SQL Editor or via psql
 */

-- Drop and recreate the trigger function with explicit NEW handling
CREATE OR REPLACE FUNCTION products_search_vector_update() 
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Explicitly use NEW (uppercase) - PostgreSQL trigger variable
  -- This ensures we're always referencing the trigger's NEW record, not a table named 'new'
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.sku, '')), 'A');
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS products_search_vector_trigger ON products;
CREATE TRIGGER products_search_vector_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION products_search_vector_update();

-- Verify the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'products'
  AND trigger_name = 'products_search_vector_trigger';
