-- ============================================
-- StoreFlow: Add deleted_at Column to Tenants Table
-- ============================================
-- 
-- This migration adds a deleted_at timestamp column to the tenants table
-- for tracking when tenants were soft-deleted, enabling retention period
-- tracking and automated hard deletion cleanup.
--
-- Generated: 2024
-- Version: 1.0
-- ============================================

-- Add deleted_at column to tenants table
ALTER TABLE tenants 
ADD COLUMN deleted_at TIMESTAMP NULL;

-- Create index on deleted_at for efficient queries (partial index for deleted tenants only)
CREATE INDEX idx_tenants_deleted_at ON tenants(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Add comment to column
COMMENT ON COLUMN tenants.deleted_at IS 'Timestamp when tenant was soft-deleted. NULL if tenant is active. Used for retention period tracking and automated cleanup.';

-- ============================================
-- Migration Notes:
-- ============================================
-- 
-- This migration:
-- 1. Adds deleted_at column (nullable) to track soft deletion timestamp
-- 2. Creates a partial index for efficient queries on deleted tenants
-- 3. Existing tenants will have deleted_at = NULL (not deleted)
-- 4. When a tenant is soft-deleted, deleted_at will be set to current timestamp
-- 5. Cleanup jobs can query: WHERE status = 'deleted' AND deleted_at < (NOW() - INTERVAL '90 days')
--
-- Related:
-- - See TENANT_DELETION_BEST_PRACTICES.md for retention policies
-- - Cleanup cron job: /api/admin/cleanup/hard-delete-tenants
-- ============================================

