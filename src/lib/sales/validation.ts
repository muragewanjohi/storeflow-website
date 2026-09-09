/**
 * Sales Validation Schemas
 * 
 * Zod schemas for validating sales/campaigns data
 * 
 * Phase 2: Backend API - Sales Implementation
 */

import { z } from 'zod';

/**
 * Strip characters that break URL paths or confuse links (keeps letters in any script, numbers, spaces, and common punctuation).
 */
export function sanitizeSaleName(name: string): string {
  return name
    .trim()
    .replace(/[^\p{L}\p{N}\s\-'.,&]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * URL-safe slug: lowercase ASCII, hyphens only (no :, %, !, &, etc.).
 */
export function generateSaleSlug(name: string): string {
  const s = String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s;
}

/**
 * Sale status enum
 */
export const saleStatusEnum = z.enum(['draft', 'active', 'scheduled', 'ended']);

function coerceOptionalDate(val: unknown): Date | null | undefined {
  if (val === undefined) return undefined;
  if (val === null || val === '') return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Map mobile camelCase keys onto snake_case before field validation. */
function normalizeSaleBody(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown>;
  const next: Record<string, unknown> = { ...o };
  if (next.start_date === undefined && next.startDate !== undefined) {
    next.start_date = next.startDate;
  }
  if (next.end_date === undefined && next.endDate !== undefined) {
    next.end_date = next.endDate;
  }
  if (next.banner_image === undefined && next.bannerImage !== undefined) {
    next.banner_image = next.bannerImage;
  }
  delete next.startDate;
  delete next.endDate;
  delete next.bannerImage;
  return next;
}

const saleBodyFields = {
  name: z.preprocess(
    (val) => (typeof val === 'string' ? sanitizeSaleName(val) : val),
    z.string().min(1, 'Sale name is required').max(255, 'Sale name must be less than 255 characters'),
  ),
  slug: z.string().optional(),
  description: z.string().nullable().optional().or(z.literal('').transform(() => null)),
  banner_image: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().url().optional().nullable(),
  ),
  badge_text: z.string().max(50, 'Badge text must be less than 50 characters').optional().nullable(),
  badge_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Badge color must be a valid hex color').optional().nullable(),
  start_date: z.preprocess(coerceOptionalDate, z.date().nullable().optional()),
  end_date: z.preprocess(coerceOptionalDate, z.date().nullable().optional()),
  status: saleStatusEnum.default('active').optional(),
  is_featured: z.boolean().default(false).optional(),
  metadata: z.record(z.string(), z.any()).default({}).optional(),
};

/**
 * Sale creation schema
 */
export const createSaleSchema = z.preprocess(
  normalizeSaleBody,
  z.object(saleBodyFields).strip(),
);

/**
 * Sale update schema (all fields optional)
 */
export const updateSaleSchema = z.preprocess(
  normalizeSaleBody,
  z.object(saleBodyFields).partial().strip(),
);

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
