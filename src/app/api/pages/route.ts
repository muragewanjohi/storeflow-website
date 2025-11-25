/**
 * Pages API Route
 * 
 * Handles GET (list pages) and POST (create page) requests
 * Full CRUD with validation, search, filtering, and pagination
 * 
 * Day 27: Content Management - Pages
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { createPageSchema, pageQuerySchema, generateSlug } from '@/lib/content/validation';
import { canCreatePage } from '@/lib/subscriptions/limits';

/**
 * GET /api/pages
 * 
 * List pages with search, filtering, and pagination
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
      } else {
        queryParams[key] = value;
      }
    }

    const validatedQuery = pageQuerySchema.parse(queryParams);

    const {
      page = 1,
      limit = 20,
      search,
      status,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = validatedQuery;

    // Build where clause
    const where: any = {
      tenant_id: tenant.id,
    };

    // Search filter (only search title and slug for performance - content search is too slow)
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Optimize orderBy to use indexed columns
    const orderBy: any = {};
    if (sort_by === 'created_at' || sort_by === 'updated_at') {
      // Use compound index for tenant_id + created_at/updated_at
      orderBy[sort_by] = sort_order;
    } else {
      orderBy[sort_by] = sort_order;
    }

    // Fetch pages with pagination
    const [pages, total] = await Promise.all([
      prisma.pages.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      }),
      prisma.pages.count({ where }),
    ]);

    // Add cache control headers to prevent caching
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, max-age=0');

    return NextResponse.json(
      {
        pages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers }
    );
  } catch (error) {
    console.error('Error fetching pages:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to fetch pages')
          : 'Failed to fetch pages'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pages
 * 
 * Create a new page
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const body = await request.json();

    // Validate request body
    const validatedData = createPageSchema.parse(body);

    // Generate slug if not provided
    const slug = validatedData.slug || generateSlug(validatedData.title);

    // Check if slug already exists for this tenant
    const existingPage = await prisma.pages.findFirst({
      where: {
        tenant_id: tenant.id,
        slug,
      },
    });

    if (existingPage) {
      return NextResponse.json(
        { error: 'A page with this slug already exists' },
        { status: 400 }
      );
    }

    // Check plan limits before creating page
    const limitCheck = await canCreatePage(tenant);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.reason || 'Page limit reached' },
        { status: 403 }
      );
    }

    // Create page
    const page = await prisma.pages.create({
      data: {
        tenant_id: tenant.id,
        title: validatedData.title,
        slug,
        content: validatedData.content || null,
        banner_image: validatedData.banner_image || null,
        meta_title: validatedData.meta_title || null,
        meta_description: validatedData.meta_description || null,
        meta_tags: validatedData.meta_tags || null,
        status: validatedData.status || 'draft',
      },
    });

    return NextResponse.json(
      { page },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating page:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to create page')
          : 'Failed to create page'
      },
      { status: 500 }
    );
  }
}

