/**
 * Public Sales API Route
 * 
 * Handles GET requests for public-facing sales listing
 * No authentication required, but tenant context is required
 * 
 * Phase 2: Backend API - Sales Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { saleQuerySchema } from '@/lib/sales/validation';
import { isSaleLiveAt } from '@/lib/sales/schedule';
import { z } from 'zod';

/**
 * GET /api/sales
 * 
 * List active sales for the current tenant (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();

    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryParams: Record<string, any> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key === 'page' || key === 'limit') {
        queryParams[key] = parseInt(value, 10) || (key === 'page' ? 1 : 20);
      } else if (key === 'is_featured') {
        queryParams[key] = value === 'true';
      } else {
        queryParams[key] = value;
      }
    }

    // Ensure page and limit have defaults
    if (!queryParams.page) {
      queryParams.page = 1;
    }
    if (!queryParams.limit) {
      queryParams.limit = 20;
    }

    // Override status to only show active sales for public API
    queryParams.status = 'active';

    const validatedQuery = saleQuerySchema.parse(queryParams);

    const {
      page = 1,
      limit = 20,
      search,
      is_featured,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = validatedQuery;

    // Status (+ optional search/featured); live window applied after fetch so
    // timezone-naive mobile start/end stamps still match merchant intent.
    const where: any = {
      tenant_id: tenant.id,
      status: 'active',
    };

    if (search) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { slug: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (is_featured !== undefined) {
      where.is_featured = is_featured;
    }

    const pageNum = typeof page === 'number' ? page : parseInt(String(page), 10);
    const limitNum = typeof limit === 'number' ? limit : parseInt(String(limit), 10);

    const orderBy: any = {};
    orderBy[sort_by] = sort_order;

    const allSales = await prisma.sales.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        banner_image: true,
        badge_text: true,
        badge_color: true,
        start_date: true,
        end_date: true,
        is_featured: true,
        created_at: true,
        _count: {
          select: {
            product_sales: true,
          },
        },
      },
    });

    const now = new Date();
    const liveSales = allSales.filter((sale) =>
      isSaleLiveAt(now, sale.start_date, sale.end_date),
    );

    const total = liveSales.length;
    const skip = (pageNum - 1) * limitNum;
    const sales = liveSales.slice(skip, skip + limitNum);

    const totalPages = Math.ceil(total / limitNum) || 0;
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    return NextResponse.json({
      sales,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error('Error fetching public sales:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to fetch sales')
          : 'Failed to fetch sales'
      },
      { status: 500 }
    );
  }
}
