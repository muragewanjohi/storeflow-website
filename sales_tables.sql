-- Sales Tables Migration
-- Run this SQL directly in Supabase SQL Editor
-- Phase 1: Database & Models - Sales Implementation

-- Create sales table
CREATE TABLE IF NOT EXISTS "sales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "banner_image" VARCHAR(255),
    "badge_text" VARCHAR(50) DEFAULT 'SALE',
    "badge_color" VARCHAR(7) DEFAULT '#EF4444',
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "status" VARCHAR(50) DEFAULT 'draft',
    "is_featured" BOOLEAN DEFAULT false,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- Create product_sales table (junction table)
CREATE TABLE IF NOT EXISTS "product_sales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "sale_price" DECIMAL(10, 2),
    "discount_percent" DECIMAL(5, 2),
    "order_index" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_sales_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "sales" 
ADD CONSTRAINT "sales_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") 
REFERENCES "tenants"("id") 
ON DELETE CASCADE 
ON UPDATE NO ACTION;

ALTER TABLE "product_sales" 
ADD CONSTRAINT "product_sales_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") 
REFERENCES "tenants"("id") 
ON DELETE CASCADE 
ON UPDATE NO ACTION;

ALTER TABLE "product_sales" 
ADD CONSTRAINT "product_sales_product_id_fkey" 
FOREIGN KEY ("product_id") 
REFERENCES "products"("id") 
ON DELETE CASCADE 
ON UPDATE NO ACTION;

ALTER TABLE "product_sales" 
ADD CONSTRAINT "product_sales_sale_id_fkey" 
FOREIGN KEY ("sale_id") 
REFERENCES "sales"("id") 
ON DELETE CASCADE 
ON UPDATE NO ACTION;

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "idx_sales_tenant_slug" 
ON "sales"("tenant_id", "slug");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_product_sales_unique" 
ON "product_sales"("tenant_id", "product_id", "sale_id");

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_sales_tenant_id" 
ON "sales"("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_sales_tenant_status" 
ON "sales"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "idx_sales_dates" 
ON "sales"("start_date", "end_date");

CREATE INDEX IF NOT EXISTS "idx_product_sales_tenant" 
ON "product_sales"("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_product_sales_product" 
ON "product_sales"("product_id");

CREATE INDEX IF NOT EXISTS "idx_product_sales_sale" 
ON "product_sales"("sale_id");

CREATE INDEX IF NOT EXISTS "idx_product_sales_active" 
ON "product_sales"("tenant_id", "sale_id", "order_index");
