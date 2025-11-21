/**
 * Inventory Validation Schemas
 * 
 * Zod schemas for validating inventory adjustment data
 */

import { z } from 'zod';

/**
 * Inventory adjustment schema
 */
export const inventoryAdjustmentSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  variant_id: z.string().uuid().optional().nullable(),
  adjustment_type: z.enum(['increase', 'decrease', 'set', 'sale', 'return', 'damage', 'transfer']),
  quantity: z.number().int('Quantity must be an integer').min(0, 'Quantity cannot be negative'),
  reason: z.string().max(255, 'Reason must be less than 255 characters').optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * Bulk inventory update schema
 */
export const bulkInventoryUpdateSchema = z.object({
  updates: z.array(
    z.object({
      product_id: z.string().uuid().optional().nullable(),
      variant_id: z.string().uuid().optional().nullable(),
      adjustment_type: z.enum(['increase', 'decrease', 'set']),
      quantity: z.number().int().min(0),
      reason: z.string().max(255).optional().nullable(),
    })
  ).min(1, 'At least one update is required'),
});

/**
 * Inventory query schema
 */
export const inventoryQuerySchema = z.object({
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
  product_id: z.string().uuid().optional(),
  variant_id: z.string().uuid().optional(),
  adjustment_type: z.enum(['increase', 'decrease', 'set', 'sale', 'return', 'damage', 'transfer']).optional(),
  low_stock_only: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().optional()
  ),
  threshold: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return 10;
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 10 : parsed;
      }
      if (typeof val === 'number') return val;
      return 10;
    },
    z.number().int().min(0)
  ).default(10).optional(),
});

