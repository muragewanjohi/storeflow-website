/**
 * Fix Products Search Vector Trigger
 * 
 * This migration fixes the trigger function to properly handle the NEW record
 * and prevent conflicts with table/record names
 * 
 * Issue: Trigger was causing "record 'new' has no field 'search_vector'" error
 * Solution: Explicitly use NEW (uppercase) and add defensive checks
 */

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS products_search_vector_trigger ON products;

-- Recreate the trigger function with explicit NEW handling
-- Using $$ quoting to avoid any string interpolation issues
CREATE OR REPLACE FUNCTION products_search_vector_update() 
RETURNS TRIGGER 
LANGUAGE plpgsql
STABLE
AS $function$
BEGIN
  -- Explicitly use NEW (uppercase) - PostgreSQL trigger variable
  -- Add defensive NULL checks to prevent errors
  IF NEW.name IS NULL AND NEW.description IS NULL AND NEW.sku IS NULL THEN
    NEW.search_vector := NULL;
    RETURN NEW;
  END IF;
  
  -- Build search vector with explicit NEW references
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.sku, '')), 'A');
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER products_search_vector_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION products_search_vector_update();

-- Verify the trigger was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.triggers 
    WHERE trigger_name = 'products_search_vector_trigger'
      AND event_object_table = 'products'
  ) THEN
    RAISE NOTICE 'Trigger products_search_vector_trigger created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create trigger';
  END IF;
END $$;
