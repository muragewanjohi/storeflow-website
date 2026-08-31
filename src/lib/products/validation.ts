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
  // Allow description to be null or empty string, but warn user about SEO impact
  description: z.string().nullable().optional().or(z.literal('').transform(() => null)),
  short_description: z.string().max(500, 'Short description must be less than 500 characters').optional().nullable(),
  price: z.number().positive('Price must be positive').or(z.string().transform((val) => parseFloat(val))),
  cost_price: z.number().min(0, 'Cost price cannot be negative').optional().nullable()
    .or(z.string().transform((val) => (val === '' ? null : parseFloat(val))).optional().nullable()),
  sale_price: z.number().positive().optional().nullable().or(z.string().transform((val) => parseFloat(val)).optional().nullable()),
  // Basic deposit support (docs/SERVICES_PLAN.md) — 'fixed' is a KES
  // amount (capped at the item's own total at checkout time, so it can
  // never exceed what the line owes), 'percentage' is 0-100. No
  // schema-level cross-check between the two here (would break
  // updateProductSchema's .partial() chain below); the dashboard/mobile
  // forms constrain the input, and checkout's computeLineDepositDue()
  // already caps a runaway fixed value defensively either way.
  deposit_type: z.enum(['none', 'fixed', 'percentage']).default('none').optional(),
  deposit_value: z.number().min(0).optional().nullable()
    .or(z.string().transform((val) => (val === '' ? null : parseFloat(val))).optional().nullable()),
  sku: z.string().max(100, 'SKU must be less than 100 characters').optional().nullable(),
  stock_quantity: z.number().int().min(0, 'Stock quantity cannot be negative').default(0).optional(),
  status: z.enum(['active', 'inactive', 'draft', 'archived']).default('active').optional(),
  image: z.string().url().optional().nullable(),
  gallery: z.array(z.string().url()).default([]).optional().or(z.literal(undefined).transform(() => [])),
  // Required at create time — a product must always belong to a category
  // (user-requested change). updateProductSchema below (.partial()) makes
  // this optional again for edits, so tweaking price/stock on an existing
  // product never forces re-picking a category.
  category_id: z.string().uuid('Please select a category for this product'),
  brand_id: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.any()).default({}).optional(),
  // Estimated delivery time in days (null means use tenant default)
  estimated_delivery_days: z.number().int().min(1).max(365).optional().nullable()
    .or(z.string().transform((val) => val ? parseInt(val, 10) : null).optional().nullable()),
}).strip(); // Strip unknown fields to prevent Prisma errors

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
  category_id: z.union([
    z.string().uuid(),
    z.string().refine((val) => {
      // Allow comma-separated UUIDs for multiple categories
      const parts = val.split(',').map(p => p.trim()).filter(Boolean);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return parts.every(part => uuidRegex.test(part) || part.length > 0); // Allow UUIDs or slugs
    }, { message: "Invalid category format" })
  ]).optional(),
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

