/**
 * Single Sale Management API Route
 * 
 * Handles GET (get sale), PUT (update sale), and DELETE (delete sale) requests
 * 
 * Phase 2: Backend API - Sales Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { updateSaleSchema, generateSaleSlug } from '@/lib/sales/validation';
import { z } from 'zod';

/**
 * GET /api/dashboard/sales/:id
 * 
 * Get a single sale with products
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const sale = await prisma.sales.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      include: {
        product_sales: {
          include: {
            products: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                sale_price: true,
                image: true,
                stock_quantity: true,
                status: true,
              },
            },
          },
          orderBy: {
            order_index: 'asc',
          },
        },
        _count: {
          select: {
            product_sales: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ sale });
  } catch (error) {
    console.error('Error fetching sale:', error);

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to fetch sale')
          : 'Failed to fetch sale'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/dashboard/sales/:id
 * 
 * Update a sale
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateSaleSchema.parse(body);

    // Check if sale exists and belongs to tenant
    const existingSale = await prisma.sales.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!existingSale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Normalize slug when provided or when name changes.
    let slug: string | undefined;
    if (validatedData.slug !== undefined) {
      slug = generateSaleSlug(validatedData.slug);
      if (!slug) {
        return NextResponse.json(
          { error: 'Invalid sale slug. Use letters, numbers, and hyphens only.' },
          { status: 400 }
        );
      }
    } else if (validatedData.name) {
      slug = generateSaleSlug(validatedData.name);
      if (!slug) {
        return NextResponse.json(
          { error: 'Invalid sale name for slug generation.' },
          { status: 400 }
        );
      }
    }

    // Check if new slug conflicts with another sale
    if (slug && slug !== existingSale.slug) {
      const slugConflict = await prisma.sales.findFirst({
        where: {
          tenant_id: tenant.id,
          slug,
          id: { not: id },
        },
      });

      if (slugConflict) {
        return NextResponse.json(
          { error: 'A sale with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Dates are already transformed by Zod schema
    const startDate = validatedData.start_date;
    const endDate = validatedData.end_date;

    // Validate date logic
    const finalStartDate = startDate || existingSale.start_date;
    const finalEndDate = endDate || existingSale.end_date;

    if (finalStartDate && finalEndDate && finalStartDate >= finalEndDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Update sale
    const sale = await prisma.sales.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(slug && { slug }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.banner_image !== undefined && { banner_image: validatedData.banner_image }),
        ...(validatedData.badge_text !== undefined && { badge_text: validatedData.badge_text }),
        ...(validatedData.badge_color !== undefined && { badge_color: validatedData.badge_color }),
        ...(startDate !== undefined && { start_date: startDate }),
        ...(endDate !== undefined && { end_date: endDate }),
        ...(validatedData.status !== undefined && { status: validatedData.status }),
        ...(validatedData.is_featured !== undefined && { is_featured: validatedData.is_featured }),
        ...(validatedData.metadata !== undefined && { metadata: validatedData.metadata }),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ sale });
  } catch (error) {
    console.error('Error updating sale:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to update sale')
          : 'Failed to update sale'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dashboard/sales/:id
 * 
 * Delete a sale (cascades to product_sales)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Check if sale exists and belongs to tenant
    const existingSale = await prisma.sales.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!existingSale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Delete sale (cascades to product_sales due to foreign key)
    await prisma.sales.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Sale deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting sale:', error);

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to delete sale')
          : 'Failed to delete sale'
      },
      { status: 500 }
    );
  }
}
