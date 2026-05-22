import { z } from 'zod';
import {
  addProductToSaleSchema,
  updateProductSaleSchema,
} from '@/lib/sales/validation';

const addProductBaseSchema = z
  .object({
    productId: z.string().uuid().optional(),
    product_id: z.string().uuid().optional(),
    salePrice: z.number().positive().optional().nullable(),
    sale_price: z.number().positive().optional().nullable(),
    orderIndex: z.number().int().min(0).optional(),
    order_index: z.number().int().min(0).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.productId && !value.product_id) {
      ctx.addIssue({
        code: 'custom',
        message: 'productId is required',
        path: ['productId'],
      });
    }
  });

export const mobileAddProductToSaleSchema = addProductBaseSchema.transform((value) =>
  addProductToSaleSchema.parse({
    product_id: value.productId ?? value.product_id,
    sale_price: value.salePrice ?? value.sale_price ?? null,
    order_index: value.orderIndex ?? value.order_index,
  }),
);

export const mobileUpdateProductSaleSchema = addProductBaseSchema.transform((value) => ({
  productId: (value.productId ?? value.product_id)!,
  update: updateProductSaleSchema.parse({
    sale_price: value.salePrice ?? value.sale_price,
    order_index: value.orderIndex ?? value.order_index,
  }),
}));
