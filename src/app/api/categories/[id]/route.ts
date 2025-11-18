/**
 * Category Detail API Route
 * 
 * Handles GET, PUT, and DELETE requests for individual categories
 * 
 * Day 15: Product Model & API
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';
import { generateSlug } from '@/lib/products/validation';

const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  image: z.string().url().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/categories/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const tenant = await requireTenant();
    const { id } = await params;

    const category = await prisma.categories.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      include: {
        other_categories: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent_id: true,
            status: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
            slug: true,
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
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/categories/[id]
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

    const validatedData = updateCategorySchema.parse(body);

    const existingCategory = await prisma.categories.findFirst({
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

    let slug = existingCategory.slug;
    if (validatedData.name && validatedData.name !== existingCategory.name) {
      slug = validatedData.slug || generateSlug(validatedData.name);
      
      const slugExists = await prisma.categories.findFirst({
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

    // Validate parent_id if provided
    if (validatedData.parent_id !== undefined && validatedData.parent_id !== null) {
      if (validatedData.parent_id === id) {
        return NextResponse.json(
          { error: 'Category cannot be its own parent' },
          { status: 400 }
        );
      }

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

    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (slug !== existingCategory.slug) updateData.slug = slug;
    if (validatedData.parent_id !== undefined) updateData.parent_id = validatedData.parent_id;
    if (validatedData.image !== undefined) updateData.image = validatedData.image;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;

    const category = await prisma.categories.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Category updated successfully',
      category,
    });
  } catch (error) {
    console.error('Error updating category:', error);

    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation error', issues: (error as any).issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;

    const category = await prisma.categories.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      include: {
        other_categories: true,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if category has children
    if (category.other_categories && category.other_categories.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with subcategories. Please delete or move subcategories first.' },
        { status: 400 }
      );
    }

    // Check if category is used by products
    const productsCount = await prisma.products.count({
      where: {
        tenant_id: tenant.id,
        category_id: id,
      },
    });

    if (productsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category. It is used by ${productsCount} product(s).` },
        { status: 400 }
      );
    }

    await prisma.categories.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}

