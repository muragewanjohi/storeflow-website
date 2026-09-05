import { z } from 'zod';

export const createAttributeSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().max(255).optional().nullable(),
  type: z.enum(['color', 'size', 'text', 'number']).optional().nullable(),
});

export const updateAttributeSchema = createAttributeSchema.partial();

export const createAttributeValueSchema = z.object({
  value: z.string().min(1).max(255),
  color_code: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
});

export const updateAttributeValueSchema = createAttributeValueSchema.partial();
