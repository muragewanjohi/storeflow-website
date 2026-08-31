/**
 * POS (Point of Sale) request validation
 *
 * Design: storeflow/docs/POS_OFFLINE_DESIGN.md
 */

import { z } from 'zod';

export const posSaleItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable().optional(),
  quantity: z.number().int().positive().max(100000),
  /** Unit price the customer was actually charged (client is trusted, same as checkout). */
  unit_price: z.number().nonnegative(),
  /** Ad-hoc per-line discount as a currency amount (not a percentage). */
  discount_amount: z.number().nonnegative().default(0),
});

export const posPaymentSchema = z
  .object({
    /**
     * - `cash` / `other`: recorded as paid immediately at the counter.
     * - `mpesa`: Tumizi customer STK push. The order is created `pending` and
     *   promoted to `paid` by the Tumizi webhook / sync poll.
     */
    method: z.enum(['cash', 'mpesa', 'other']),
    status: z.enum(['paid', 'pending']).default('paid'),
    amount_tendered: z.number().nonnegative().nullable().optional(),
    reference: z.string().trim().max(255).nullable().optional(),
    /** Required for `mpesa` — the payer's Kenyan M-Pesa number. */
    phone_number: z.string().trim().min(9).max(20).nullable().optional(),
  })
  .refine(
    (p) => p.method !== 'mpesa' || !!p.phone_number,
    { message: 'phone_number is required for M-Pesa', path: ['phone_number'] },
  );

export const posCustomerSchema = z.object({
  name: z.string().trim().max(255).optional().default(''),
  phone: z.string().trim().max(50).optional().default(''),
  email: z.string().trim().max(255).optional().default(''),
});

export const posSaleSchema = z.object({
  /** Client-generated UUID. Idempotency key: re-POSTing the same id is a no-op. */
  client_sale_id: z.string().uuid(),
  /** Human-facing receipt number shown on the printed/shared receipt before sync. */
  receipt_number: z.string().trim().min(1).max(100),
  /** Real wall-clock time of the sale (device clock) when created offline. */
  offline_created_at: z.string().datetime().optional(),
  pos_device_label: z.string().trim().max(100).optional(),
  customer: posCustomerSchema.optional(),
  items: z.array(posSaleItemSchema).min(1).max(200),
  /** Order-level discount as a currency amount, applied after line discounts. */
  order_discount_amount: z.number().nonnegative().default(0),
  payment: posPaymentSchema,
  notes: z.string().trim().max(2000).optional(),
});

export type PosSaleInput = z.infer<typeof posSaleSchema>;
export type PosSaleItemInput = z.infer<typeof posSaleItemSchema>;
