import { z } from 'zod';

export const mobileInventoryAdjustmentSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
  variant_id: z.string().uuid().optional().nullable(),
  variantId: z.string().uuid().optional().nullable(),
  adjustment_type: z
    .enum(['increase', 'decrease', 'set', 'sale', 'return', 'damage', 'transfer'])
    .optional(),
  adjustmentType: z
    .enum(['increase', 'decrease', 'set', 'sale', 'return', 'damage', 'transfer'])
    .optional(),
  quantity: z.number().int().min(0),
  reason: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export function toInventoryAdjustmentInput(
  parsed: z.infer<typeof mobileInventoryAdjustmentSchema>,
) {
  const adjustmentType = parsed.adjustment_type ?? parsed.adjustmentType;
  if (!adjustmentType) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['adjustmentType'],
        message: 'adjustmentType is required',
      },
    ]);
  }

  return {
    product_id: parsed.product_id ?? parsed.productId ?? null,
    variant_id: parsed.variant_id ?? parsed.variantId ?? null,
    adjustment_type: adjustmentType,
    quantity: parsed.quantity,
    reason: parsed.reason ?? null,
    notes: parsed.notes ?? null,
  };
}

export const mobileBulkInventorySchema = z.object({
  updates: z
    .array(
      z.object({
        product_id: z.string().uuid().optional().nullable(),
        productId: z.string().uuid().optional().nullable(),
        variant_id: z.string().uuid().optional().nullable(),
        variantId: z.string().uuid().optional().nullable(),
        adjustment_type: z.enum(['increase', 'decrease', 'set']).optional(),
        adjustmentType: z.enum(['increase', 'decrease', 'set']).optional(),
        quantity: z.number().int().min(0),
        reason: z.string().max(255).optional().nullable(),
      }),
    )
    .min(1),
});

export function toBulkInventoryInput(parsed: z.infer<typeof mobileBulkInventorySchema>) {
  return {
    updates: parsed.updates.map((update) => {
      const adjustmentType = update.adjustment_type ?? update.adjustmentType;
      if (!adjustmentType) {
        throw new z.ZodError([
          {
            code: 'custom',
            path: ['updates', 'adjustmentType'],
            message: 'adjustmentType is required for each update',
          },
        ]);
      }
      return {
        product_id: update.product_id ?? update.productId ?? null,
        variant_id: update.variant_id ?? update.variantId ?? null,
        adjustment_type: adjustmentType,
        quantity: update.quantity,
        reason: update.reason ?? null,
      };
    }),
  };
}

export const mobileInventorySettingsSchema = z.object({
  threshold: z.number().int().min(0).max(10000),
});
