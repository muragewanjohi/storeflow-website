/**
 * Inventory Adjustment API Route
 * 
 * Handles POST requests for inventory adjustments
 * Tracks stock changes in inventory_history
 * 
 * Day 17: Inventory & Stock Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { inventoryAdjustmentSchema } from '@/lib/inventory/validation';

/**
 * POST /api/inventory/adjust
 * 
 * Adjust inventory for a product or variant
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const body = await request.json();

    const validatedData = inventoryAdjustmentSchema.parse(body);

    // Validate that either product_id or variant_id is provided
    if (!validatedData.product_id && !validatedData.variant_id) {
      return NextResponse.json(
        { error: 'Either product_id or variant_id must be provided' },
        { status: 400 }
      );
    }

    // Validate that both are not provided
    if (validatedData.product_id && validatedData.variant_id) {
      return NextResponse.json(
        { error: 'Cannot adjust both product and variant inventory at the same time' },
        { status: 400 }
      );
    }

    let quantityBefore = 0;
    let quantityAfter = 0;
    let quantityChange = 0;
    let product = null;
    let variant = null;

    // Adjust product inventory
    if (validatedData.product_id) {
      product = await prisma.products.findFirst({
        where: {
          id: validatedData.product_id,
          tenant_id: tenant.id,
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      quantityBefore = product.stock_quantity || 0;

      // Calculate new quantity based on adjustment type
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

      // Update product stock
      await prisma.products.update({
        where: { id: validatedData.product_id },
        data: { stock_quantity: quantityAfter },
      });
    }

    // Adjust variant inventory
    if (validatedData.variant_id) {
      variant = await prisma.product_variants.findFirst({
        where: {
          id: validatedData.variant_id,
          tenant_id: tenant.id,
        },
      });

      if (!variant) {
        return NextResponse.json(
          { error: 'Variant not found' },
          { status: 404 }
        );
      }

      quantityBefore = variant.stock_quantity || 0;

      // Calculate new quantity based on adjustment type
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

      // Update variant stock
      await prisma.product_variants.update({
        where: { id: validatedData.variant_id },
        data: { stock_quantity: quantityAfter },
      });

      // Sync product-level stock if this variant belongs to a product
      if (validatedData.product_id) {
        const { syncProductStockFromVariants } = await import('@/lib/inventory/sync-product-stock');
        await syncProductStockFromVariants(validatedData.product_id, tenant.id);
      }
    }

    // Create inventory history record
    const history = await prisma.inventory_history.create({
      data: {
        tenant_id: tenant.id,
        product_id: validatedData.product_id || null,
        variant_id: validatedData.variant_id || null,
        adjustment_type: validatedData.adjustment_type,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        quantity_change: quantityChange,
        reason: validatedData.reason || null,
        notes: validatedData.notes || null,
        adjusted_by: user.id,
      },
    });

    return NextResponse.json({
      message: 'Inventory adjusted successfully',
      adjustment: {
        id: history.id,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        quantity_change: quantityChange,
      },
    });
  } catch (error) {
    console.error('Error adjusting inventory:', error);

    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation error', issues: (error as any).issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to adjust inventory' },
      { status: 500 }
    );
  }
}

