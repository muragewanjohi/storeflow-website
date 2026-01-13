-- Run this SQL in Supabase SQL Editor to mark the migration as applied
-- This tells Prisma that the migration has already been run
-- 
-- IMPORTANT: Run this AFTER you've already created the tables using sales_tables.sql

-- First, let's check if the migration record already exists
-- If it does, this will do nothing (ON CONFLICT DO NOTHING)

-- Calculate a checksum for the migration (Prisma uses SHA256)
-- For simplicity, we'll use the migration name as a placeholder
-- Prisma will recalculate this on next sync

INSERT INTO "_prisma_migrations" (
    "id",
    "checksum",
    "finished_at",
    "migration_name",
    "logs",
    "rolled_back_at",
    "started_at",
    "applied_steps_count"
) 
SELECT 
    gen_random_uuid(),
    encode(digest('20250101000000_add_sales_tables', 'sha256'), 'hex'),
    NOW(),
    '20250101000000_add_sales_tables',
    NULL,
    NULL,
    NOW(),
    1
WHERE NOT EXISTS (
    SELECT 1 FROM "_prisma_migrations" 
    WHERE "migration_name" = '20250101000000_add_sales_tables'
);

-- Verify the migration was recorded
SELECT * FROM "_prisma_migrations" 
WHERE "migration_name" = '20250101000000_add_sales_tables';
