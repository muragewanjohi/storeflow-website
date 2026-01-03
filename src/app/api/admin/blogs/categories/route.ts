/**
 * Admin Blog Categories API Route
 * 
 * Handles GET and POST requests for blog categories (admin/landlord)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { createBlogCategorySchema, generateSlug } from '@/lib/content/validation';
import { MARKETING_TENANT_ID } from '@/lib/content/marketing';

/**
 * GET /api/admin/blogs/categories
 * 
 * List blog categories for admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    // For landlords, return marketing categories; for tenant users, return their tenant's categories
    const categories = await prisma.blog_categories.findMany({
      where: user.tenant_id 
        ? { tenant_id: user.tenant_id } 
        : { tenant_id: MARKETING_TENANT_ID },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching blog categories:', error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to fetch categories')
          : 'Failed to fetch categories'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/blogs/categories
 * 
 * Create a new blog category
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    // Validate request body
    const validatedData = createBlogCategorySchema.parse(body);

    // Determine tenant_id: landlords use marketing, tenant users use their tenant_id
    const tenantId = user.tenant_id || MARKETING_TENANT_ID;

    // Generate slug if not provided
    const slug = validatedData.slug || generateSlug(validatedData.name);

    // Check if slug already exists for this tenant
    const existingCategory = await prisma.blog_categories.findFirst({
      where: {
        tenant_id: tenantId,
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
        tenant_id: tenantId,
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
          ? (error instanceof Error ? error.message : 'Failed to create category')
          : 'Failed to create category'
      },
      { status: 500 }
    );
  }
}

