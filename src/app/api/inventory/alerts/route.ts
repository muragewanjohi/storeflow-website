/**
 * Inventory Alerts API Route
 * 
 * Handles GET requests for low stock alerts
 * 
 * Day 17: Inventory & Stock Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { inventoryQuerySchema } from '@/lib/inventory/validation';

/**
 * GET /api/inventory/alerts
 * 
 * Get products/variants with low stock
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryParams: Record<string, any> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key === 'threshold') {
        queryParams[key] = parseInt(value, 10) || 10;
      } else {
        queryParams[key] = value;
      }
    }

    const validatedQuery = inventoryQuerySchema.parse(queryParams);
    const threshold = validatedQuery.threshold || 10;

    // Get products with low stock
    const lowStockProducts = await prisma.products.findMany({
      where: {
        tenant_id: tenant.id,
        status: {
          in: ['active', 'draft'],
        },
        OR: [
          {
            stock_quantity: {
              lte: threshold,
            },
          },
          {
            stock_quantity: null,
          },
        ],
        // Exclude products that have variants (variants handle their own stock)
        product_variants: {
          none: {},
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock_quantity: true,
        status: true,
        image: true,
      },
      orderBy: {
        stock_quantity: 'asc',
      },
    });

    // Get variants with low stock
    const lowStockVariants = await prisma.product_variants.findMany({
      where: {
        tenant_id: tenant.id,
        stock_quantity: {
          lte: threshold,
        },
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
            status: true,
            image: true,
          },
        },
        product_variant_attributes: {
          include: {
            attributes: {
              select: {
                name: true,
              },
            },
            attribute_values: {
              select: {
                value: true,
                color_code: true,
              },
            },
          },
        },
      },
      orderBy: {
        stock_quantity: 'asc',
      },
    });

    // Format variant data
    const formattedVariants = lowStockVariants.map((variant) => ({
      id: variant.id,
      product_id: variant.product_id,
      product_name: variant.products.name,
      product_sku: variant.products.sku,
      variant_sku: variant.sku,
      stock_quantity: variant.stock_quantity,
      attributes: variant.product_variant_attributes.map((attr) => ({
        name: attr.attributes.name,
        value: attr.attribute_values.value,
        color_code: attr.attribute_values.color_code,
      })),
    }));

    return NextResponse.json({
      threshold,
      products: lowStockProducts,
      variants: formattedVariants,
      total_alerts: lowStockProducts.length + lowStockVariants.length,
    });
  } catch (error) {
    console.error('Error fetching inventory alerts:', error);

    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation error', issues: (error as any).issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch inventory alerts' },
      { status: 500 }
    );
  }
}

