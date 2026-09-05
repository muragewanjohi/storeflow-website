import { prisma } from '@/lib/prisma/client';
import {
  bulkInventoryUpdateSchema,
  inventoryAdjustmentSchema,
  inventoryQuerySchema,
} from '@/lib/inventory/validation';
import { getLowStockThreshold, setLowStockThreshold } from '@/lib/inventory/threshold';
import { syncProductStockFromVariants } from '@/lib/inventory/sync-product-stock';
import type { z } from 'zod';

export class InventoryOperationError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = 'InventoryOperationError';
  }
}

type AdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;

export async function adjustInventoryForTenant(
  tenantId: string,
  userId: string,
  input: AdjustmentInput,
) {
  const validatedData = inventoryAdjustmentSchema.parse(input);

  if (!validatedData.product_id && !validatedData.variant_id) {
    throw new InventoryOperationError('Either product_id or variant_id must be provided');
  }

  if (validatedData.product_id && validatedData.variant_id) {
    throw new InventoryOperationError(
      'Cannot adjust both product and variant inventory at the same time',
    );
  }

  let quantityBefore = 0;
  let quantityAfter = 0;
  let quantityChange = 0;

  if (validatedData.product_id) {
    const product = await prisma.products.findFirst({
      where: { id: validatedData.product_id, tenant_id: tenantId },
    });

    if (!product) {
      throw new InventoryOperationError('Product not found', 404);
    }

    quantityBefore = product.stock_quantity || 0;

    switch (validatedData.adjustment_type) {
      case 'increase':
        quantityAfter = quantityBefore + validatedData.quantity;
        quantityChange = validatedData.quantity;
        break;
      case 'decrease':
        quantityAfter = Math.max(0, quantityBefore - validatedData.quantity);
        quantityChange = -validatedData.quantity;
        break;
      case 'set':
        quantityAfter = validatedData.quantity;
        quantityChange = validatedData.quantity - quantityBefore;
        break;
      default:
        quantityAfter = quantityBefore;
        quantityChange = 0;
    }

    await prisma.products.update({
      where: { id: validatedData.product_id },
      data: { stock_quantity: quantityAfter },
    });
  }

  if (validatedData.variant_id) {
    const variant = await prisma.product_variants.findFirst({
      where: { id: validatedData.variant_id, tenant_id: tenantId },
    });

    if (!variant) {
      throw new InventoryOperationError('Variant not found', 404);
    }

    quantityBefore = variant.stock_quantity || 0;

    switch (validatedData.adjustment_type) {
      case 'increase':
        quantityAfter = quantityBefore + validatedData.quantity;
        quantityChange = validatedData.quantity;
        break;
      case 'decrease':
        quantityAfter = Math.max(0, quantityBefore - validatedData.quantity);
        quantityChange = -validatedData.quantity;
        break;
      case 'set':
        quantityAfter = validatedData.quantity;
        quantityChange = validatedData.quantity - quantityBefore;
        break;
      default:
        quantityAfter = quantityBefore;
        quantityChange = 0;
    }

    await prisma.product_variants.update({
      where: { id: validatedData.variant_id },
      data: { stock_quantity: quantityAfter },
    });

    if (variant.product_id) {
      await syncProductStockFromVariants(variant.product_id, tenantId);
    }
  }

  const history = await prisma.inventory_history.create({
    data: {
      tenant_id: tenantId,
      product_id: validatedData.product_id || null,
      variant_id: validatedData.variant_id || null,
      adjustment_type: validatedData.adjustment_type,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      quantity_change: quantityChange,
      reason: validatedData.reason || null,
      notes: validatedData.notes || null,
      adjusted_by: userId,
    },
  });

  return {
    id: history.id,
    quantityBefore,
    quantityAfter,
    quantityChange,
  };
}

type BulkInput = z.infer<typeof bulkInventoryUpdateSchema>;

export async function bulkUpdateInventoryForTenant(
  tenantId: string,
  userId: string,
  input: BulkInput,
) {
  const validatedData = bulkInventoryUpdateSchema.parse(input);
  const results: Array<Record<string, unknown>> = [];
  const errors: Array<Record<string, unknown>> = [];
  const productsToSync = new Set<string>();

  for (const update of validatedData.updates) {
    try {
      if (!update.product_id && !update.variant_id) {
        errors.push({ update, error: 'Either product_id or variant_id must be provided' });
        continue;
      }

      let quantityBefore = 0;
      let quantityAfter = 0;
      let quantityChange = 0;

      if (update.product_id) {
        const product = await prisma.products.findFirst({
          where: { id: update.product_id, tenant_id: tenantId },
        });

        if (!product) {
          errors.push({ update, error: 'Product not found' });
          continue;
        }

        quantityBefore = product.stock_quantity || 0;

        switch (update.adjustment_type) {
          case 'increase':
            quantityAfter = quantityBefore + update.quantity;
            quantityChange = update.quantity;
            break;
          case 'decrease':
            quantityAfter = Math.max(0, quantityBefore - update.quantity);
            quantityChange = -update.quantity;
            break;
          case 'set':
            quantityAfter = update.quantity;
            quantityChange = update.quantity - quantityBefore;
            break;
        }

        await prisma.products.update({
          where: { id: update.product_id },
          data: { stock_quantity: quantityAfter },
        });

        await prisma.inventory_history.create({
          data: {
            tenant_id: tenantId,
            product_id: update.product_id,
            variant_id: null,
            adjustment_type: update.adjustment_type,
            quantity_before: quantityBefore,
            quantity_after: quantityAfter,
            quantity_change: quantityChange,
            reason: update.reason || null,
            adjusted_by: userId,
          },
        });

        results.push({
          product_id: update.product_id,
          quantity_before: quantityBefore,
          quantity_after: quantityAfter,
          success: true,
        });
      }

      if (update.variant_id) {
        const variant = await prisma.product_variants.findFirst({
          where: { id: update.variant_id, tenant_id: tenantId },
        });

        if (!variant) {
          errors.push({ update, error: 'Variant not found' });
          continue;
        }

        quantityBefore = variant.stock_quantity || 0;

        switch (update.adjustment_type) {
          case 'increase':
            quantityAfter = quantityBefore + update.quantity;
            quantityChange = update.quantity;
            break;
          case 'decrease':
            quantityAfter = Math.max(0, quantityBefore - update.quantity);
            quantityChange = -update.quantity;
            break;
          case 'set':
            quantityAfter = update.quantity;
            quantityChange = update.quantity - quantityBefore;
            break;
        }

        await prisma.product_variants.update({
          where: { id: update.variant_id },
          data: { stock_quantity: quantityAfter },
        });

        await prisma.inventory_history.create({
          data: {
            tenant_id: tenantId,
            product_id: null,
            variant_id: update.variant_id,
            adjustment_type: update.adjustment_type,
            quantity_before: quantityBefore,
            quantity_after: quantityAfter,
            quantity_change: quantityChange,
            reason: update.reason || null,
            adjusted_by: userId,
          },
        });

        results.push({
          variant_id: update.variant_id,
          quantity_before: quantityBefore,
          quantity_after: quantityAfter,
          success: true,
        });

        if (variant.product_id) {
          productsToSync.add(variant.product_id);
        }
      }
    } catch (error) {
      errors.push({
        update,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  for (const productId of productsToSync) {
    await syncProductStockFromVariants(productId, tenantId).catch((err) => {
      console.error(`Error syncing product stock for ${productId}:`, err);
    });
  }

  return { results, errors };
}

export async function getInventoryHistoryForTenant(
  tenantId: string,
  queryInput: Record<string, unknown>,
) {
  const validatedQuery = inventoryQuerySchema.parse(queryInput);
  const { page = 1, limit = 20, product_id, variant_id, adjustment_type } = validatedQuery;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { tenant_id: tenantId };
  if (product_id) where.product_id = product_id;
  if (variant_id) where.variant_id = variant_id;
  if (adjustment_type) where.adjustment_type = adjustment_type;

  const [history, total] = await Promise.all([
    prisma.inventory_history.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        products: { select: { id: true, name: true, sku: true } },
        product_variants: { select: { id: true, sku: true } },
      },
    }),
    prisma.inventory_history.count({ where }),
  ]);

  return {
    history,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getInventoryAlertsForTenant(
  tenantId: string,
  queryInput: Record<string, unknown>,
) {
  const validatedQuery = inventoryQuerySchema.parse(queryInput);
  const threshold = validatedQuery.threshold || 10;

  const [lowStockProducts, lowStockVariants] = await Promise.all([
    prisma.products.findMany({
      where: {
        tenant_id: tenantId,
        status: { in: ['active', 'draft'] },
        OR: [{ stock_quantity: { lte: threshold } }, { stock_quantity: null }],
        product_variants: { none: {} },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock_quantity: true,
        status: true,
        image: true,
      },
      orderBy: { stock_quantity: 'asc' },
    }),
    prisma.product_variants.findMany({
      where: {
        tenant_id: tenantId,
        stock_quantity: { lte: threshold },
      },
      include: {
        products: {
          select: { id: true, name: true, sku: true, status: true, image: true },
        },
        product_variant_attributes: {
          include: {
            attributes: { select: { name: true } },
            attribute_values: { select: { value: true, color_code: true } },
          },
        },
      },
      orderBy: { stock_quantity: 'asc' },
    }),
  ]);

  const formattedVariants = lowStockVariants.map((variant) => ({
    id: variant.id,
    productId: variant.product_id,
    productName: variant.products.name,
    productSku: variant.products.sku,
    variantSku: variant.sku,
    stockQuantity: variant.stock_quantity,
    attributes: variant.product_variant_attributes.map((attr) => ({
      name: attr.attributes.name,
      value: attr.attribute_values.value,
      colorCode: attr.attribute_values.color_code,
    })),
  }));

  return {
    threshold,
    products: lowStockProducts,
    variants: formattedVariants,
    totalAlerts: lowStockProducts.length + lowStockVariants.length,
  };
}

export async function getInventorySettingsForTenant(tenantId: string) {
  const threshold = await getLowStockThreshold(tenantId);
  return { threshold };
}

export async function updateInventorySettingsForTenant(tenantId: string, threshold: number) {
  await setLowStockThreshold(tenantId, threshold);
  return { threshold };
}
