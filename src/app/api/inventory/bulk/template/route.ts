/**
 * Bulk Inventory CSV Template API Route
 * 
 * Generates and downloads a CSV template for bulk inventory updates
 * 
 * Day 17: Inventory & Stock Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';

/**
 * GET /api/inventory/bulk/template
 * 
 * Download CSV template for bulk inventory updates
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    // Fetch sample products and variants for the template
    const [products, variants] = await Promise.all([
      prisma.products.findMany({
        where: {
          tenant_id: tenant.id,
          status: {
            in: ['active', 'draft'],
          },
        },
        select: {
          id: true,
          name: true,
          sku: true,
        },
        take: 5,
        orderBy: {
          name: 'asc',
        },
      }),
      prisma.product_variants.findMany({
        where: {
          tenant_id: tenant.id,
        },
        include: {
          products: {
            select: {
              name: true,
              sku: true,
            },
          },
        },
        take: 5,
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);

    // Build CSV content
    const headers = [
      'Type',
      'SKU',
      'Adjustment Type',
      'Quantity',
      'Reason',
    ];

    const rows: string[][] = [headers];

    // Add example rows for products
    products.forEach((product: any) => {
      rows.push([
        'product',
        product.sku || product.id,
        'set',
        '10',
        'restock',
      ]);
    });

    // Add example rows for variants
    variants.forEach((variant: any) => {
      rows.push([
        'variant',
        variant.sku || variant.id,
        'increase',
        '5',
        'manual_adjustment',
      ]);
    });

    // Convert to CSV string
    const csvContent = rows
      .map((row: any) =>
        row
          .map((cell: any) => {
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            const escaped = String(cell).replace(/"/g, '""');
            if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
              return `"${escaped}"`;
            }
            return escaped;
          })
          .join(',')
      )
      .join('\n');

    // Add BOM for Excel compatibility
    const csvWithBom = '\uFEFF' + csvContent;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="bulk-inventory-template-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating CSV template:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSV template' },
      { status: 500 }
    );
  }
}

