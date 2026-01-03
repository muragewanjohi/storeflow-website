/**
 * Admin Blog Category API Route (Single)
 * 
 * Handles GET, PUT, and DELETE requests for a single blog category
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { updateBlogCategorySchema, generateSlug } from '@/lib/content/validation';
import { MARKETING_TENANT_ID } from '@/lib/content/marketing';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/blogs/categories/[id]
 * 
 * Get a single blog category
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const category = await prisma.blog_categories.findFirst({
      where: {
        id,
        tenant_id: user.tenant_id || MARKETING_TENANT_ID,
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
          ? (error instanceof Error ? error.message : 'Failed to fetch category')
          : 'Failed to fetch category'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/blogs/categories/[id]
 * 
 * Update a blog category
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = updateBlogCategorySchema.parse(body);

    // Check if category exists and belongs to user's tenant
    const category = await prisma.blog_categories.findFirst({
      where: {
        id,
        tenant_id: user.tenant_id || MARKETING_TENANT_ID,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Generate slug if name changed and slug not provided
    const slug = validatedData.slug || (validatedData.name ? generateSlug(validatedData.name) : category.slug);

    // Check if slug already exists for another category
    if (slug && slug !== category.slug) {
      const existingCategory = await prisma.blog_categories.findFirst({
        where: {
          tenant_id: user.tenant_id || MARKETING_TENANT_ID,
          slug,
          NOT: { id },
        },
      });

      if (existingCategory) {
        return NextResponse.json(
          { error: 'A category with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Update category
    const updatedCategory = await prisma.blog_categories.update({
      where: { id },
      data: {
        ...validatedData,
        slug: slug || category.slug,
      },
    });

    return NextResponse.json({ category: updatedCategory });
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
          ? (error instanceof Error ? error.message : 'Failed to update category')
          : 'Failed to update category'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/blogs/categories/[id]
 * 
 * Delete a blog category
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Check if category exists and belongs to user's tenant
    const category = await prisma.blog_categories.findFirst({
      where: {
        id,
        tenant_id: user.tenant_id || MARKETING_TENANT_ID,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if category is used by any blogs
    const blogsUsingCategory = await prisma.blogs.count({
      where: {
        category_id: id,
      },
    });

    if (blogsUsingCategory > 0) {
      return NextResponse.json(
        { error: `Cannot delete category. It is used by ${blogsUsingCategory} blog post(s).` },
        { status: 400 }
      );
    }

    // Delete category
    await prisma.blog_categories.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog category:', error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to delete category')
          : 'Failed to delete category'
      },
      { status: 500 }
    );
  }
}

