/**
 * Order Validation Schemas
 * 
 * Zod schemas for validating order and cart data
 */

import { z } from 'zod';

/**
 * Cart item schema
 */
export const cartItemSchema = z.object({
  product_id: z.string().uuid('Product ID must be a valid UUID'),
  variant_id: z.string().uuid('Variant ID must be a valid UUID').optional().nullable(),
  quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
});

/**
 * Add to cart schema
 */
export const addToCartSchema = cartItemSchema;

/**
 * Update cart item schema
 */
export const updateCartItemSchema = z.object({
  quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
});

/**
 * Checkout schema
 */
export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'At least one item is required'),
  shipping_address: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(1, 'Phone is required'),
    address_line_1: z.string().min(1, 'Address line 1 is required'),
    address_line_2: z.string().optional().nullable(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postal_code: z.string().min(1, 'Postal code is required'),
    country: z.string().min(1, 'Country is required'),
  }),
  billing_address: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(1, 'Phone is required'),
    address_line_1: z.string().min(1, 'Address line 1 is required'),
    address_line_2: z.string().optional().nullable(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postal_code: z.string().min(1, 'Postal code is required'),
    country: z.string().min(1, 'Country is required'),
  }).optional(),
  payment_method: z.enum(['pesapal', 'paypal', 'cash_on_delivery']),
  coupon_code: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * Order status update schema
 */
export const orderStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  notes: z.string().optional().nullable(),
});

/**
 * Order payment status update schema
 */
export const orderPaymentStatusUpdateSchema = z.object({
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']),
  transaction_id: z.string().optional().nullable(),
  payment_gateway: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * Order query/filter schema
 */
export const orderQuerySchema = z.object({
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
  status: z.preprocess(
    (val) => (val === null || val === undefined || val === '') ? undefined : val,
    z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional()
  ),
  payment_status: z.preprocess(
    (val) => (val === null || val === undefined || val === '') ? undefined : val,
    z.enum(['pending', 'paid', 'failed', 'refunded']).optional()
  ),
  order_number: z.preprocess(
    (val) => (val === null || val === undefined || val === '') ? undefined : val,
    z.string().optional()
  ),
  customer_email: z.preprocess(
    (val) => (val === null || val === undefined || val === '') ? undefined : val,
    z.string().email().optional()
  ),
  start_date: z.preprocess(
    (val) => (val === null || val === undefined || val === '') ? undefined : val,
    z.string().datetime().optional()
  ),
  end_date: z.preprocess(
    (val) => (val === null || val === undefined || val === '') ? undefined : val,
    z.string().datetime().optional()
  ),
  sort_by: z.enum(['created_at', 'total_amount', 'order_number']).default('created_at').optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc').optional(),
});

/**
 * Order cancellation schema
 */
export const cancelOrderSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500, 'Reason must be less than 500 characters'),
  refund: z.boolean().default(false).optional(),
  notes: z.string().optional().nullable(),
});

