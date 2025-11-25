/**
 * Blog Category Detail API Route
 * 
 * Handles GET (get category), PUT (update category), and DELETE (delete category) requests
 * 
 * Day 27: Content Management - Blog Categories
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { updateBlogCategorySchema, generateSlug } from '@/lib/content/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/blogs/categories/[id]
 * 
 * Get a single blog category by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const tenant = await requireTenant();
    const { id } = await params;

    const category = await prisma.blog_categories.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      include: {
        _count: {
          select: {
            blogs: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error fetching blog category:', error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to fetch blog category')
          : 'Failed to fetch blog category'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/blogs/categories/[id]
 * 
 * Update a blog category
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = updateBlogCategorySchema.parse(body);

    // Check if category exists and belongs to tenant
    const existingCategory = await prisma.blog_categories.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Generate slug if name is being updated and slug is not provided
    let slug = validatedData.slug;
    if (validatedData.name && !slug) {
      slug = generateSlug(validatedData.name);
    } else if (!slug) {
      slug = existingCategory.slug ?? undefined;
    }

    // Check if slug already exists for another category
    if (slug && slug !== existingCategory.slug) {
      const slugExists = await prisma.blog_categories.findFirst({
        where: {
          tenant_id: tenant.id,
          slug,
          id: { not: id },
        },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'A category with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Update category
    const category = await prisma.blog_categories.update({
      where: { id },
      data: {
        name: validatedData.name,
        slug: slug || undefined,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error updating blog category:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to update blog category')
          : 'Failed to update blog category'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/blogs/categories/[id]
 * 
 * Delete a blog category
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;

    // Check if category exists and belongs to tenant
    const category = await prisma.blog_categories.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      include: {
        _count: {
          select: {
            blogs: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if category has blogs
    if (category._count.blogs > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with existing blog posts. Please reassign or delete the blog posts first.' },
        { status: 400 }
      );
    }

    // Delete category
    await prisma.blog_categories.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Category deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting blog category:', error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to delete blog category')
          : 'Failed to delete blog category'
      },
      { status: 500 }
    );
  }
}

