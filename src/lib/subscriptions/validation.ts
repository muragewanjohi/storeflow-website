/**
 * Subscription Validation Schemas
 * 
 * Zod schemas for validating subscription-related data
 */

import { z } from 'zod';

/**
 * Schema for creating a price plan
 */
export const createPricePlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(255, 'Plan name must be less than 255 characters'),
  price: z.number().positive('Price must be positive'),
  duration_months: z.number().int().positive('Duration must be a positive integer'),
  trial_days: z.number().int().min(0).optional().default(0), // Trial period in days (0 = no trial)
  features: z.object({}).passthrough().optional().default({}),
  status: z.enum(['active', 'inactive']).default('active'),
});

/**
 * Schema for updating a price plan
 */
export const updatePricePlanSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  price: z.number().positive().optional(),
  duration_months: z.number().int().positive().optional(),
  trial_days: z.number().int().min(0).optional(), // Trial period in days (0 = no trial)
  features: z.object({}).passthrough().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

/**
 * Schema for changing subscription
 */
export const changeSubscriptionSchema = z.object({
  plan_id: z.string().uuid('Plan ID must be a valid UUID'),
  action: z.enum(['upgrade', 'downgrade', 'renew']).optional(),
});

