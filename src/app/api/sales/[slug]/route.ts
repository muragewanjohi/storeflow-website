/**
 * Public Single Sale API Route
 * 
 * Handles GET request for a single sale by slug (public endpoint)
 * Returns sale with products
 * 
 * Phase 2: Backend API - Sales Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

/**
 * GET /api/sales/:slug
 * 
 * Get a single sale by slug with products (public endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const tenant = await requireTenant();
    const { slug } = await params;

    const now = new Date();

    // Find active sale by slug
    const sale = await prisma.sales.findFirst({
      where: {
        slug,
        tenant_id: tenant.id,
        status: 'active',
        // Check if sale is currently active based on dates
        OR: [
          // Sales with no dates (always active)
          {
            start_date: null,
            end_date: null,
          },
          // Sales that have started and not ended
          {
            start_date: { lte: now },
            end_date: { gte: now },
          },
          // Sales that have started but no end date
          {
            start_date: { lte: now },
            end_date: null,
          },
          // Sales with no start date but have end date in future
          {
            start_date: null,
            end_date: { gte: now },
          },
        ],
      },
      include: {
        product_sales: {
          where: {
            products: {
              status: 'active', // Only include active products
            },
          },
          include: {
            products: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                sale_price: true,
                image: true,
                stock_quantity: true,
                status: true,
                category_id: true,
                description: true,
                short_description: true,
              },
            },
          },
          orderBy: {
            order_index: 'asc',
          },
        },
        _count: {
          select: {
            product_sales: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found or not active' },
        { status: 404 }
      );
    }

    // Map products with sale pricing
    const products = sale.product_sales.map((ps) => {
      const product = ps.products;
      const regularPrice = Number(product.price);
      const salePrice = ps.sale_price ? Number(ps.sale_price) : (product.sale_price ? Number(product.sale_price) : null);
      
      // Use sale-specific price if available, otherwise use product sale_price
      const finalPrice = salePrice || regularPrice;
      const compareAtPrice = salePrice && salePrice < regularPrice ? regularPrice : null;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: finalPrice,
        compareAtPrice,
        image: product.image,
        stock_quantity: product.stock_quantity,
        status: product.status,
        category_id: product.category_id,
        description: product.description,
        short_description: product.short_description,
        sale_price: salePrice,
        discount_percent: ps.discount_percent ? Number(ps.discount_percent) : null,
        order_index: ps.order_index,
      };
    });

    return NextResponse.json({
      sale: {
        id: sale.id,
        name: sale.name,
        slug: sale.slug,
        description: sale.description,
        banner_image: sale.banner_image,
        badge_text: sale.badge_text,
        badge_color: sale.badge_color,
        start_date: sale.start_date,
        end_date: sale.end_date,
        is_featured: sale.is_featured,
        product_count: sale._count.product_sales,
      },
      products,
    });
  } catch (error) {
    console.error('Error fetching sale by slug:', error);

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to fetch sale')
          : 'Failed to fetch sale'
      },
      { status: 500 }
    );
  }
}
