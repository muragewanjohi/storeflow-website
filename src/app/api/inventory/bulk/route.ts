/**
 * Bulk Inventory Update API Route
 * 
 * Handles POST requests for bulk inventory updates
 * 
 * Day 17: Inventory & Stock Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { bulkInventoryUpdateSchema } from '@/lib/inventory/validation';

/**
 * POST /api/inventory/bulk
 * 
 * Update inventory for multiple products/variants at once
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const body = await request.json();

    const validatedData = bulkInventoryUpdateSchema.parse(body);

    const results: any[] = [];
    const errors: any[] = [];
    const productsToSync = new Set<string>();

    // Process each update
    for (const update of validatedData.updates) {
      try {
        // Validate that either product_id or variant_id is provided
        if (!update.product_id && !update.variant_id) {
          errors.push({
            update,
            error: 'Either product_id or variant_id must be provided',
          });
          continue;
        }

        let quantityBefore = 0;
        let quantityAfter = 0;
        let quantityChange = 0;

        // Update product inventory
        if (update.product_id) {
          const product = await prisma.products.findFirst({
            where: {
              id: update.product_id,
              tenant_id: tenant.id,
            },
          });

          if (!product) {
            errors.push({
              update,
              error: 'Product not found',
            });
            continue;
          }

          quantityBefore = product.stock_quantity || 0;

          // Calculate new quantity
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

          // Update product stock
          await prisma.products.update({
            where: { id: update.product_id },
            data: { stock_quantity: quantityAfter },
          });

          // Create history record
          await prisma.inventory_history.create({
            data: {
              tenant_id: tenant.id,
              product_id: update.product_id,
              variant_id: null,
              adjustment_type: update.adjustment_type,
              quantity_before: quantityBefore,
              quantity_after: quantityAfter,
              quantity_change: quantityChange,
              reason: update.reason || null,
              adjusted_by: user.id,
            },
          });

          results.push({
            product_id: update.product_id,
            quantity_before: quantityBefore,
            quantity_after: quantityAfter,
            success: true,
          });
        }

        // Update variant inventory
        if (update.variant_id) {
          const variant = await prisma.product_variants.findFirst({
            where: {
              id: update.variant_id,
              tenant_id: tenant.id,
            },
          });

          if (!variant) {
            errors.push({
              update,
              error: 'Variant not found',
            });
            continue;
          }

          quantityBefore = variant.stock_quantity || 0;

          // Calculate new quantity
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

          // Update variant stock
          await prisma.product_variants.update({
            where: { id: update.variant_id },
            data: { stock_quantity: quantityAfter },
          });

          // Create history record
          await prisma.inventory_history.create({
            data: {
              tenant_id: tenant.id,
              product_id: null,
              variant_id: update.variant_id,
              adjustment_type: update.adjustment_type,
              quantity_before: quantityBefore,
              quantity_after: quantityAfter,
              quantity_change: quantityChange,
              reason: update.reason || null,
              adjusted_by: user.id,
            },
          });

          results.push({
            variant_id: update.variant_id,
            quantity_before: quantityBefore,
            quantity_after: quantityAfter,
            success: true,
          });

          // Track product for syncing if variant belongs to a product
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

    // Sync product-level stock for all products with variants
    if (productsToSync.size > 0) {
      const { syncProductStockFromVariants } = await import('@/lib/inventory/sync-product-stock');
      for (const productId of productsToSync) {
        await syncProductStockFromVariants(productId, tenant.id).catch((err) => {
          console.error(`Error syncing product stock for ${productId}:`, err);
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} updates${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in bulk inventory update:', error);

    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation error', issues: (error as any).issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}

