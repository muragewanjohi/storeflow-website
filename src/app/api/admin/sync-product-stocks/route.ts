/**
 * Admin API: Sync Product Stocks
 * 
 * One-time endpoint to sync all products' stock_quantity with their variant totals.
 * For products with variants: stock_quantity = sum of variant stocks
 * 
 * POST /api/admin/sync-product-stocks
 * 
 * Requires landlord authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';

export async function POST(request: NextRequest) {
  try {
    // Require landlord authentication
    const user = await requireAuth();
    
    if (user.role !== 'landlord') {
      return NextResponse.json(
        { error: 'Only landlords can run this sync' },
        { status: 403 }
      );
    }

    console.log('Starting product stock sync...');

    // Get all products that have variants
    const productsWithVariants = await prisma.products.findMany({
      where: {
        product_variants: {
          some: {}, // Has at least one variant
        },
      },
      select: {
        id: true,
        name: true,
        tenant_id: true,
        stock_quantity: true,
        product_variants: {
          select: {
            stock_quantity: true,
          },
        },
      },
    });

    console.log(`Found ${productsWithVariants.length} products with variants.`);

    let updated = 0;
    let skipped = 0;
    const updates: Array<{ name: string; oldStock: number; newStock: number }> = [];

    for (const product of productsWithVariants) {
      // Calculate sum of variant stocks
      const variantTotal = product.product_variants.reduce((sum, variant) => {
        return sum + (variant.stock_quantity ?? 0);
      }, 0);

      // Check if update is needed
      if (product.stock_quantity === variantTotal) {
        skipped++;
        continue;
      }

      // Update product stock
      await prisma.products.update({
        where: { id: product.id },
        data: { stock_quantity: variantTotal },
      });

      updates.push({
        name: product.name,
        oldStock: product.stock_quantity ?? 0,
        newStock: variantTotal,
      });
      updated++;
    }

    console.log(`Sync complete. Updated: ${updated}, Skipped: ${skipped}`);

    return NextResponse.json({
      success: true,
      message: 'Product stock sync complete',
      summary: {
        total_products_with_variants: productsWithVariants.length,
        updated,
        already_synced: skipped,
      },
      updates,
    });
  } catch (error) {
    console.error('Error syncing product stocks:', error);
    return NextResponse.json(
      { error: 'Failed to sync product stocks' },
      { status: 500 }
    );
  }
}

