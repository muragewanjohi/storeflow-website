/**
 * Content Management Validation Schemas
 * 
 * Zod schemas for validating pages and blogs data
 */

import { z } from 'zod';

/**
 * Generate slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Page creation schema
 */
export const createPageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  slug: z.string().optional(),
  content: z.string().optional().nullable(),
  banner_image: z.string().url().optional().nullable(),
  meta_title: z.string().max(255, 'Meta title must be less than 255 characters').optional().nullable(),
  meta_description: z.string().optional().nullable(),
  meta_tags: z.string().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft').optional(),
});

/**
 * Page update schema (all fields optional)
 */
export const updatePageSchema = createPageSchema.partial();

/**
 * Page query/filter schema
 */
export const pageQuerySchema = z.object({
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
  status: z.enum(['draft', 'published', 'archived']).optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'title']).default('created_at').optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc').optional(),
});

/**
 * Blog creation schema
 */
export const createBlogSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  slug: z.string().optional(),
  content: z.string().optional().nullable(),
  excerpt: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  image: z.string().url().optional().nullable(),
  meta_title: z.string().max(255, 'Meta title must be less than 255 characters').optional().nullable(),
  meta_description: z.string().optional().nullable(),
  meta_tags: z.string().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft').optional(),
});

/**
 * Blog update schema (all fields optional)
 */
export const updateBlogSchema = createBlogSchema.partial();

/**
 * Blog query/filter schema
 */
export const blogQuerySchema = z.object({
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
  status: z.enum(['draft', 'published', 'archived']).optional(),
  category_id: z.string().uuid().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'title']).default('created_at').optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc').optional(),
});

/**
 * Blog category creation schema
 */
export const createBlogCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255, 'Category name must be less than 255 characters'),
  slug: z.string().optional(),
});

/**
 * Blog category update schema
 */
export const updateBlogCategorySchema = createBlogCategorySchema.partial();

