/**
 * Sales Management API Route
 * 
 * Handles GET (list sales) and POST (create sale) requests
 * Full CRUD with validation, search, filtering, and pagination
 * 
 * Phase 2: Backend API - Sales Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { createSaleSchema, saleQuerySchema, generateSaleSlug } from '@/lib/sales/validation';
import { z } from 'zod';

/**
 * GET /api/dashboard/sales
 * 
 * List all sales for the current tenant with search, filtering, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

    // Verify user belongs to tenant
    if (user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

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

    const validatedQuery = saleQuerySchema.parse(queryParams);

    const {
      page = 1,
      limit = 20,
      search,
      status,
      is_featured,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = validatedQuery;

    // Build where clause
    const where: any = {
      tenant_id: tenant.id,
    };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { slug: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
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
          status: true,
          is_featured: true,
          created_at: true,
          updated_at: true,
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
    console.error('Error fetching sales:', error);

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

/**
 * POST /api/dashboard/sales
 * 
 * Create a new sale
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

    // Verify user belongs to tenant
    if (user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createSaleSchema.parse(body);

    // Always sanitize slug to keep sale URLs browser-safe.
    const slugSource = validatedData.slug?.trim() || validatedData.name;
    const slug = generateSaleSlug(slugSource);
    if (!slug) {
      return NextResponse.json(
        { error: 'Invalid sale slug. Use letters, numbers, and hyphens only.' },
        { status: 400 }
      );
    }

    // Check if slug already exists for this tenant
    const existingSale = await prisma.sales.findFirst({
      where: {
        tenant_id: tenant.id,
        slug,
      },
    });

    if (existingSale) {
      return NextResponse.json(
        { error: 'A sale with this slug already exists' },
        { status: 400 }
      );
    }

    // Dates are already transformed by Zod schema
    const startDate = validatedData.start_date || null;
    const endDate = validatedData.end_date || null;

    // Validate date logic
    if (startDate && endDate && startDate >= endDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Create sale
    const sale = await prisma.sales.create({
      data: {
        tenant_id: tenant.id,
        name: validatedData.name,
        slug,
        description: validatedData.description || null,
        banner_image: validatedData.banner_image || null,
        badge_text: validatedData.badge_text || 'SALE',
        badge_color: validatedData.badge_color || '#EF4444',
        start_date: startDate,
        end_date: endDate,
        status: validatedData.status || 'draft',
        is_featured: validatedData.is_featured || false,
        metadata: validatedData.metadata || {},
      },
    });

    return NextResponse.json(
      { sale },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating sale:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to create sale')
          : 'Failed to create sale'
      },
      { status: 500 }
    );
  }
}
