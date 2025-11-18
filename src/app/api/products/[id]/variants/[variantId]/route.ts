/**
 * Product Variant Detail API Route
 * 
 * Handles PUT (update variant) and DELETE (delete variant) requests
 * 
 * Day 15: Product Model & API
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const updateVariantSchema = z.object({
  attribute_id: z.string().uuid().optional().nullable(),
  attribute_value_id: z.string().uuid().optional().nullable(),
  price: z.number().positive().optional().nullable().or(z.string().transform((val) => parseFloat(val)).optional().nullable()),
  stock_quantity: z.number().int().min(0).optional(),
  sku: z.string().max(100).optional().nullable(),
  image: z.string().url().optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string; variantId: string }>;
}

/**
 * PUT /api/products/[id]/variants/[variantId]
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id, variantId } = await params;
    const body = await request.json();

    const validatedData = updateVariantSchema.parse(body);

    // Verify variant exists and belongs to product and tenant
    const variant = await prisma.product_variants.findFirst({
      where: {
        id: variantId,
        product_id: id,
        tenant_id: tenant.id,
      },
    });

    if (!variant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (validatedData.attribute_id !== undefined) updateData.attribute_id = validatedData.attribute_id;
    if (validatedData.attribute_value_id !== undefined) updateData.attribute_value_id = validatedData.attribute_value_id;
    if (validatedData.price !== undefined) updateData.price = validatedData.price;
    if (validatedData.stock_quantity !== undefined) updateData.stock_quantity = validatedData.stock_quantity;
    if (validatedData.sku !== undefined) updateData.sku = validatedData.sku;
    if (validatedData.image !== undefined) updateData.image = validatedData.image;

    const updatedVariant = await prisma.product_variants.update({
      where: { id: variantId },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Variant updated successfully',
      variant: updatedVariant,
    });
  } catch (error) {
    console.error('Error updating variant:', error);

    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation error', issues: (error as any).issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update variant' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]/variants/[variantId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id, variantId } = await params;

    const variant = await prisma.product_variants.findFirst({
      where: {
        id: variantId,
        product_id: id,
        tenant_id: tenant.id,
      },
    });

    if (!variant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    await prisma.product_variants.delete({
      where: { id: variantId },
    });

    return NextResponse.json({
      message: 'Variant deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting variant:', error);
    return NextResponse.json(
      { error: 'Failed to delete variant' },
      { status: 500 }
    );
  }
}

