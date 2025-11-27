/**
 * Dashboard API: Sync Product Stocks
 * 
 * Endpoint for tenant admins to sync their products' stock_quantity with variant totals.
 * For products with variants: stock_quantity = sum of variant stocks
 * 
 * POST /api/dashboard/sync-product-stocks
 * 
 * Requires tenant_admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    
    // Only tenant admins can run this
    if (!['tenant_admin', 'landlord'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only tenant admins can run this sync' },
        { status: 403 }
      );
    }

    console.log(`Starting product stock sync for tenant: ${tenant.name}`);

    // Get all products for this tenant that have variants
    const productsWithVariants = await prisma.products.findMany({
      where: {
        tenant_id: tenant.id,
        product_variants: {
          some: {}, // Has at least one variant
        },
      },
      select: {
        id: true,
        name: true,
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

