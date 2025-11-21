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

const variantAttributeSchema = z.object({
  attribute_id: z.string().uuid(),
  attribute_value_id: z.string().uuid(),
});

const updateAttributeValueSchema = z.object({
  value: z.string().min(1).max(255).optional(),
  color_code: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  image: z.string().url().optional().nullable(),
});

const updateVariantSchema = z.object({
  // Legacy single attribute (for backward compatibility)
  attribute_id: z.string().uuid().optional().nullable(),
  attribute_value_id: z.string().uuid().optional().nullable(),
  // New: Multiple attributes array
  attributes: z.array(variantAttributeSchema).optional(),
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

    // Update variant in a transaction
    const updatedVariant = await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (validatedData.attribute_id !== undefined) updateData.attribute_id = validatedData.attribute_id;
      if (validatedData.attribute_value_id !== undefined) updateData.attribute_value_id = validatedData.attribute_value_id;
      if (validatedData.price !== undefined) updateData.price = validatedData.price;
      if (validatedData.stock_quantity !== undefined) updateData.stock_quantity = validatedData.stock_quantity;
      if (validatedData.sku !== undefined) updateData.sku = validatedData.sku;
      if (validatedData.image !== undefined) updateData.image = validatedData.image;

      // Update variant
      const variant = await tx.product_variants.update({
        where: { id: variantId },
        data: updateData,
      });

      // Update attributes if provided
      if (validatedData.attributes !== undefined) {
        // Delete existing variant attributes
        await tx.product_variant_attributes.deleteMany({
          where: {
            variant_id: variantId,
            tenant_id: tenant.id,
          },
        });

        // Create new variant attributes
        if (validatedData.attributes.length > 0) {
          await tx.product_variant_attributes.createMany({
            data: validatedData.attributes.map((attr) => ({
              tenant_id: tenant.id,
              variant_id: variantId,
              attribute_id: attr.attribute_id,
              attribute_value_id: attr.attribute_value_id,
            })),
          });
        }
      }

      // Fetch complete variant with attributes
      return await tx.product_variants.findUnique({
        where: { id: variantId },
        include: {
          variant_attributes: {
            include: {
              attributes: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
              attribute_values: {
                select: {
                  id: true,
                  value: true,
                  color_code: true,
                },
              },
            },
          },
        },
      });
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

