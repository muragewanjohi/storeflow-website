/**
 * Attribute Value Detail API Route
 * 
 * Handles PUT (update value) and DELETE (delete value) requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const updateAttributeValueSchema = z.object({
  value: z.string().min(1).max(255).optional(),
  color_code: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  // Note: Images are stored at variant level, not attribute value level
});

interface RouteParams {
  params: Promise<{ id: string; valueId: string }>;
}

/**
 * PUT /api/attributes/[id]/values/[valueId]
 * 
 * Update an attribute value
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id, valueId } = await params;
    const body = await request.json();

    const validatedData = updateAttributeValueSchema.parse(body);

    // Verify attribute value exists and belongs to attribute and tenant
    const attributeValue = await prisma.attribute_values.findFirst({
      where: {
        id: valueId,
        attribute_id: id,
        tenant_id: tenant.id,
      },
    });

    if (!attributeValue) {
      return NextResponse.json(
        { error: 'Attribute value not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (validatedData.value !== undefined) updateData.value = validatedData.value;
    if (validatedData.color_code !== undefined) updateData.color_code = validatedData.color_code;
    // Note: image field should not be updated here - variant images are in product_variants

    const updatedValue = await prisma.attribute_values.update({
      where: { id: valueId },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Attribute value updated successfully',
      value: updatedValue,
    });
  } catch (error) {
    console.error('Error updating attribute value:', error);

    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation error', issues: (error as any).issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update attribute value' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/attributes/[id]/values/[valueId]
 * 
 * Delete an attribute value
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id, valueId } = await params;

    const attributeValue = await prisma.attribute_values.findFirst({
      where: {
        id: valueId,
        attribute_id: id,
        tenant_id: tenant.id,
      },
    });

    if (!attributeValue) {
      return NextResponse.json(
        { error: 'Attribute value not found' },
        { status: 404 }
      );
    }

    await prisma.attribute_values.delete({
      where: { id: valueId },
    });

    return NextResponse.json({
      message: 'Attribute value deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting attribute value:', error);
    return NextResponse.json(
      { error: 'Failed to delete attribute value' },
      { status: 500 }
    );
  }
}

