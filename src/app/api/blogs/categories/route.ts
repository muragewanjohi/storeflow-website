/**
 * Blog Categories API Route
 * 
 * Handles GET (list categories) and POST (create category) requests
 * 
 * Day 27: Content Management - Blog Categories
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { createBlogCategorySchema, generateSlug } from '@/lib/content/validation';

/**
 * GET /api/blogs/categories
 * 
 * List all blog categories for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();

    const categories = await prisma.blog_categories.findMany({
      where: {
        tenant_id: tenant.id,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            blogs: true,
          },
        },
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching blog categories:', error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to fetch blog categories')
          : 'Failed to fetch blog categories'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blogs/categories
 * 
 * Create a new blog category
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const body = await request.json();

    // Validate request body
    const validatedData = createBlogCategorySchema.parse(body);

    // Generate slug if not provided
    const slug = validatedData.slug || generateSlug(validatedData.name);

    // Check if slug already exists for this tenant
    const existingCategory = await prisma.blog_categories.findFirst({
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

    // Create category
    const category = await prisma.blog_categories.create({
      data: {
        tenant_id: tenant.id,
        name: validatedData.name,
        slug,
      },
    });

    return NextResponse.json(
      { category },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating blog category:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to create blog category')
          : 'Failed to create blog category'
      },
      { status: 500 }
    );
  }
}

