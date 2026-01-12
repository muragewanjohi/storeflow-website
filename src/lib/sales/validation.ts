/**
 * Sales Validation Schemas
 * 
 * Zod schemas for validating sales/campaigns data
 * 
 * Phase 2: Backend API - Sales Implementation
 */

import { z } from 'zod';

/**
 * Generate slug from sale name
 */
export function generateSaleSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Sale status enum
 */
export const saleStatusEnum = z.enum(['draft', 'active', 'scheduled', 'ended']);

/**
 * Sale creation schema
 */
export const createSaleSchema = z.object({
  name: z.string().min(1, 'Sale name is required').max(255, 'Sale name must be less than 255 characters'),
  slug: z.string().optional(),
  description: z.string().nullable().optional().or(z.literal('').transform(() => null)),
  banner_image: z.string().url().optional().nullable().or(z.literal('').transform(() => null)),
  badge_text: z.string().max(50, 'Badge text must be less than 50 characters').optional().nullable(),
  badge_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Badge color must be a valid hex color').optional().nullable(),
  start_date: z.preprocess(
    (val) => {
      if (!val || val === '') return null;
      if (val instanceof Date) return val;
      if (typeof val === 'string') {
        try {
          return new Date(val);
        } catch {
          return null;
        }
      }
      return null;
    },
    z.date().nullable().optional()
  ),
  end_date: z.preprocess(
    (val) => {
      if (!val || val === '') return null;
      if (val instanceof Date) return val;
      if (typeof val === 'string') {
        try {
          return new Date(val);
        } catch {
          return null;
        }
      }
      return null;
    },
    z.date().nullable().optional()
  ),
  status: saleStatusEnum.default('draft').optional(),
  is_featured: z.boolean().default(false).optional(),
  metadata: z.record(z.string(), z.any()).default({}).optional(),
}).strip();

/**
 * Sale update schema (all fields optional)
 */
export const updateSaleSchema = createSaleSchema.partial().strip();

/**
 * Sale query/filter schema
 */
export const saleQuerySchema = z.object({
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
  status: saleStatusEnum.optional(),
  is_featured: z.preprocess(
    (val) => {
      if (typeof val === 'string') return val === 'true';
      if (typeof val === 'boolean') return val;
      return undefined;
    },
    z.boolean().optional()
  ).optional(),
  sort_by: z.enum(['name', 'start_date', 'end_date', 'created_at', 'updated_at']).default('created_at').optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc').optional(),
});

/**
 * Add product to sale schema
 */
export const addProductToSaleSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  sale_price: z.number().positive().optional().nullable(),
  order_index: z.number().int().min(0).default(0).optional(),
}).strip();

/**
 * Update product sale schema
 */
export const updateProductSaleSchema = z.object({
  sale_price: z.number().positive().optional().nullable(),
  order_index: z.number().int().min(0).optional(),
}).strip();
