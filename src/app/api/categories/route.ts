/**
 * Categories API Route
 * 
 * Handles GET (list categories) and POST (create category) requests
 * 
 * Day 15: Product Model & API
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';
import { generateSlug } from '@/lib/products/validation';

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255, 'Category name must be less than 255 characters'),
  slug: z.string().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  image: z.string().url().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active').optional(),
});

const categoryQuerySchema = z.object({
  parent_id: z.string().uuid().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  include_children: z.string().transform((val) => val === 'true').optional(),
});

/**
 * GET /api/categories
 * 
 * List categories (optionally filtered by parent)
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);

    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = categoryQuerySchema.parse(queryParams);

    const { parent_id, status, include_children } = validatedQuery;

    // Build where clause
    const where: any = {
      tenant_id: tenant.id,
    };

    if (parent_id !== undefined) {
      where.parent_id = parent_id;
    } else if (!include_children) {
      // If not including children, only get top-level categories
      where.parent_id = null;
    }

    if (status) {
      where.status = status;
    }

    const categories = await prisma.categories.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
      include: {
        other_categories: include_children ? {
          select: {
            id: true,
            name: true,
            slug: true,
            parent_id: true,
            status: true,
          },
        } : false,
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);

    if (error instanceof Error) {
      if (error.message === 'Tenant not found') {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to fetch categories'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * 
 * Create a new category
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const body = await request.json();

    // Validate request body
    const validatedData = createCategorySchema.parse(body);

    // Generate slug if not provided
    const slug = validatedData.slug || generateSlug(validatedData.name);

    // Check if slug already exists for this tenant
    const existingCategory = await prisma.categories.findFirst({
      where: {
        tenant_id: tenant.id,
        slug,
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'A category with this slug already exists' },
        { status: 400 }
      );
    }

    // Validate parent_id if provided
    if (validatedData.parent_id) {
      const parentCategory = await prisma.categories.findFirst({
        where: {
          id: validatedData.parent_id,
          tenant_id: tenant.id,
        },
      });

      if (!parentCategory) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 400 }
        );
      }
    }

    // Create category
    const category = await prisma.categories.create({
      data: {
        tenant_id: tenant.id,
        name: validatedData.name,
        slug,
        parent_id: validatedData.parent_id || null,
        image: validatedData.image || null,
        status: validatedData.status || 'active',
      },
    });

    return NextResponse.json(
      { category },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating category:', error);

    if (error instanceof Error) {
      if (error.message === 'Tenant not found') {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation error', issues: (error as any).issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to create category'
      },
      { status: 500 }
    );
  }
}

