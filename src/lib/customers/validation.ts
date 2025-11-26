/**
 * Customer Validation Schemas
 * 
 * Zod schemas for validating customer data
 */

import { z } from 'zod';

/**
 * Customer registration schema
 */
export const customerRegisterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
});

/**
 * Customer login schema
 */
export const customerLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Customer update schema
 */
export const customerUpdateSchema = z.object({
  name: z.string().min(1).max(255),
  username: z.string().max(255).optional().nullable(),
  mobile: z.string().max(20).optional().nullable(),
  company: z.string().max(255).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  image: z.string().optional().nullable(),
});

/**
 * Customer password change schema
 */
export const customerPasswordChangeSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * Customer password reset request schema
 */
export const customerPasswordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Customer password reset schema
 */
export const customerPasswordResetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Customer email verification schema
 */
export const customerEmailVerificationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * Customer address schema
 */
export const customerAddressSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state_id: z.string().uuid().optional().nullable(),
  country_id: z.string().uuid().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  is_default: z.boolean().default(false),
});

/**
 * Customer query/filter schema
 */
export const customerQuerySchema = z.object({
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
  search: z.preprocess(
    (val) => (val === null || val === undefined || val === '') ? undefined : val,
    z.string().optional()
  ),
  email: z.preprocess(
    (val) => (val === null || val === undefined || val === '') ? undefined : val,
    z.string().email().optional()
  ),
  sort_by: z.enum(['created_at', 'name', 'email']).default('created_at').optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc').optional(),
});

