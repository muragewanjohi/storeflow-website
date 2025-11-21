/**
 * Attribute Detail API Route
 * 
 * Handles GET, PUT, and DELETE requests for a specific attribute
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const updateAttributeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().max(255).optional().nullable(),
  type: z.enum(['color', 'size', 'text', 'number']).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/attributes/[id]
 * 
 * Get attribute by ID with values
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const tenant = await requireTenant();
    const { id } = await params;

    const attribute = await prisma.attributes.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      include: {
        attribute_values: {
          orderBy: {
            value: 'asc',
          },
        },
      },
    });

    if (!attribute) {
      return NextResponse.json(
        { error: 'Attribute not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ attribute });
  } catch (error) {
    console.error('Error fetching attribute:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attribute' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/attributes/[id]
 * 
 * Update attribute
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

    const validatedData = updateAttributeSchema.parse(body);

    // Verify attribute exists and belongs to tenant
    const attribute = await prisma.attributes.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!attribute) {
      return NextResponse.json(
        { error: 'Attribute not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.slug !== undefined) updateData.slug = validatedData.slug;
    if (validatedData.type !== undefined) updateData.type = validatedData.type;

    const updatedAttribute = await prisma.attributes.update({
      where: { id },
      data: updateData,
      include: {
        attribute_values: true,
      },
    });

    return NextResponse.json({
      message: 'Attribute updated successfully',
      attribute: updatedAttribute,
    });
  } catch (error) {
    console.error('Error updating attribute:', error);

    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation error', issues: (error as any).issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update attribute' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/attributes/[id]
 * 
 * Delete attribute (cascades to attribute values)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;

    const attribute = await prisma.attributes.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!attribute) {
      return NextResponse.json(
        { error: 'Attribute not found' },
        { status: 404 }
      );
    }

    await prisma.attributes.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Attribute deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting attribute:', error);
    return NextResponse.json(
      { error: 'Failed to delete attribute' },
      { status: 500 }
    );
  }
}

