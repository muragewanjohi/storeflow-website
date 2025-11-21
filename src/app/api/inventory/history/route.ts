/**
 * Inventory History API Route
 * 
 * Handles GET requests for inventory history
 * 
 * Day 17: Inventory & Stock Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { inventoryQuerySchema } from '@/lib/inventory/validation';

/**
 * GET /api/inventory/history
 * 
 * Get inventory adjustment history
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryParams: Record<string, any> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key === 'page' || key === 'limit' || key === 'threshold') {
        queryParams[key] = parseInt(value, 10) || (key === 'page' ? 1 : key === 'limit' ? 20 : 10);
      } else if (key === 'low_stock_only') {
        queryParams[key] = value === 'true';
      } else {
        queryParams[key] = value;
      }
    }

    const validatedQuery = inventoryQuerySchema.parse(queryParams);

    const {
      page = 1,
      limit = 20,
      product_id,
      variant_id,
      adjustment_type,
    } = validatedQuery;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenant_id: tenant.id,
    };

    if (product_id) {
      where.product_id = product_id;
    }

    if (variant_id) {
      where.variant_id = variant_id;
    }

    if (adjustment_type) {
      where.adjustment_type = adjustment_type;
    }

    // Fetch history with pagination
    const [history, total] = await Promise.all([
      prisma.inventory_history.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc',
        },
        include: {
          products: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          product_variants: {
            select: {
              id: true,
              sku: true,
            },
          },
        },
      }),
      prisma.inventory_history.count({ where }),
    ]);

    return NextResponse.json({
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching inventory history:', error);

    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation error', issues: (error as any).issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch inventory history' },
      { status: 500 }
    );
  }
}

