/**
 * Form Builder Validation Schemas
 * 
 * Zod schemas for validating form builder data
 */

import { z } from 'zod';

/**
 * Form field types
 */
export const formFieldTypeSchema = z.enum([
  'text',
  'email',
  'tel',
  'number',
  'textarea',
  'select',
  'checkbox',
  'radio',
  'date',
  'file',
  'url',
]);

/**
 * Form field schema
 */
export const formFieldSchema = z.object({
  id: z.string(),
  type: formFieldTypeSchema,
  label: z.string().min(1, 'Label is required'),
  name: z.string().min(1, 'Field name is required'),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // For select, radio, checkbox
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
  }).optional(),
  order: z.number().default(0),
});

/**
 * Form builder creation schema
 */
export const createFormBuilderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  slug: z.string().optional(),
  description: z.string().optional(),
  email: z.string().email('Invalid email address').optional().nullable(),
  button_text: z.string().max(100, 'Button text must be less than 100 characters').default('Submit').optional(),
  fields: z.array(formFieldSchema).default([]),
  success_message: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active').optional(),
});

/**
 * Form builder update schema (all fields optional)
 */
export const updateFormBuilderSchema = createFormBuilderSchema.partial();

/**
 * Form submission schema
 */
export const formSubmissionSchema = z.object({
  form_id: z.string().uuid('Invalid form ID'),
  data: z.record(z.string(), z.any()), // Key-value pairs of form field values
});

/**
 * Generate slug from title
 */
export function generateFormSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

