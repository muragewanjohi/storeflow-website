/**
 * Product Validation Schemas
 * 
 * Zod schemas for validating product data
 */

import { z } from 'zod';

/**
 * Product creation schema
 */
export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255, 'Product name must be less than 255 characters'),
  slug: z.string().optional(),
  description: z.string().optional(),
  short_description: z.string().max(500, 'Short description must be less than 500 characters').optional(),
  price: z.number().positive('Price must be positive').or(z.string().transform((val) => parseFloat(val))),
  sale_price: z.number().positive().optional().nullable().or(z.string().transform((val) => parseFloat(val)).optional().nullable()),
  sku: z.string().max(100, 'SKU must be less than 100 characters').optional().nullable(),
  stock_quantity: z.number().int().min(0, 'Stock quantity cannot be negative').default(0).optional(),
  status: z.enum(['active', 'inactive', 'draft', 'archived']).default('active').optional(),
  image: z.string().url().optional().nullable(),
  gallery: z.array(z.string().url()).default([]).optional(),
  category_id: z.string().uuid().optional().nullable(),
  brand_id: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.any()).default({}).optional(),
});

/**
 * Product update schema (all fields optional, strips unknown fields)
 */
export const updateProductSchema = createProductSchema.partial().strip();

/**
 * Product query/filter schema
 */
export const productQuerySchema = z.object({
  page: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return 1;
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 1 : parsed;
      }
      if (typeof val === 'number') return val;
      return 1;
    },
    z.number().int().min(1)
  ).default(1).optional(),
  limit: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return 20;
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 20 : parsed;
      }
      if (typeof val === 'number') return val;
      return 20;
    },
    z.number().int().min(1).max(100)
  ).default(20).optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'draft', 'archived']).optional(),
  category_id: z.string().uuid().optional(),
  brand_id: z.string().uuid().optional(),
  min_price: z.preprocess(
    (val) => {
      if (typeof val === 'string') return parseFloat(val);
      if (typeof val === 'number') return val;
      return undefined;
    },
    z.number().min(0).optional()
  ).optional(),
  max_price: z.preprocess(
    (val) => {
      if (typeof val === 'string') return parseFloat(val);
      if (typeof val === 'number') return val;
      return undefined;
    },
    z.number().min(0).optional()
  ).optional(),
  in_stock: z.preprocess(
    (val) => {
      if (typeof val === 'string') return val === 'true';
      if (typeof val === 'boolean') return val;
      return undefined;
    },
    z.boolean().optional()
  ).optional(),
  sort_by: z.enum(['name', 'price', 'created_at', 'updated_at']).default('created_at').optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc').optional(),
});

/**
 * Generate product slug from name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate SKU from product name
 */
export function generateSKU(name: string, tenantId?: string): string {
  const prefix = tenantId ? tenantId.substring(0, 4).toUpperCase() : 'PRD';
  const namePart = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${namePart}-${random}`;
}

