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

    // Build where clause - only active sales
    const now = new Date();
    const where: any = {
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
    };

    // Search filter
    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search.trim(), mode: 'insensitive' } },
            { description: { contains: search.trim(), mode: 'insensitive' } },
            { slug: { contains: search.trim(), mode: 'insensitive' } },
          ],
        },
      ];
    }

    // Featured filter
    if (is_featured !== undefined) {
      where.is_featured = is_featured;
    }

    // Calculate pagination
    const pageNum = typeof page === 'number' ? page : parseInt(String(page), 10);
    const limitNum = typeof limit === 'number' ? limit : parseInt(String(limit), 10);
    const skip = (pageNum - 1) * limitNum;

    // Build orderBy
    const orderBy: any = {};
    orderBy[sort_by] = sort_order;

    // Fetch sales with pagination
    const [sales, total] = await Promise.all([
      prisma.sales.findMany({
        where,
        skip,
        take: limitNum,
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
      }),
      prisma.sales.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNum);
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
