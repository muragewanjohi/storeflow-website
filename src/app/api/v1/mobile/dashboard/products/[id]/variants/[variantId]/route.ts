import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { syncProductStockFromVariants } from '@/lib/inventory/sync-product-stock';

const variantAttributeSchema = z.object({
  attribute_id: z.string().uuid(),
  attribute_value_id: z.string().uuid(),
});

const updateVariantSchema = z.object({
  // Legacy single attribute support
  attribute_id: z.string().uuid().optional().nullable(),
  attribute_value_id: z.string().uuid().optional().nullable(),
  // Multi-attribute support
  attributes: z.array(variantAttributeSchema).optional(),
  price: z
    .number()
    .positive()
    .optional()
    .nullable()
    .or(z.string().transform((val) => parseFloat(val)).optional().nullable()),
  cost_price: z
    .number()
    .min(0)
    .optional()
    .nullable()
    .or(z.string().transform((val) => parseFloat(val)).optional().nullable()),
  stock_quantity: z.number().int().min(0).optional(),
  sku: z.string().max(100).optional().nullable(),
  image: z.string().url().optional().nullable(),
});

async function updateVariant(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id, variantId } = await params;

  try {
    const body = await request.json();
    const validatedData = updateVariantSchema.parse(body);

    const existing = await prisma.product_variants.findFirst({
      where: {
        id: variantId,
        product_id: id,
        tenant_id: tenantId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Variant not found'), { status: 404 });
    }

    const updatedVariant = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updateData: Record<string, unknown> = {};
      if (validatedData.attribute_id !== undefined) updateData.attribute_id = validatedData.attribute_id;
      if (validatedData.attribute_value_id !== undefined) {
        updateData.attribute_value_id = validatedData.attribute_value_id;
      }
      if (validatedData.price !== undefined) updateData.price = validatedData.price;
      if (validatedData.cost_price !== undefined) updateData.cost_price = validatedData.cost_price;
      if (validatedData.stock_quantity !== undefined) updateData.stock_quantity = validatedData.stock_quantity;
      if (validatedData.sku !== undefined) updateData.sku = validatedData.sku;
      if (validatedData.image !== undefined) updateData.image = validatedData.image;

      await tx.product_variants.update({
        where: { id: variantId },
        data: updateData,
      });

      if (validatedData.attributes !== undefined) {
        await tx.product_variant_attributes.deleteMany({
          where: {
            variant_id: variantId,
            tenant_id: tenantId,
          },
        });

        if (validatedData.attributes.length > 0) {
          await tx.product_variant_attributes.createMany({
            data: validatedData.attributes.map((attr) => ({
              tenant_id: tenantId,
              variant_id: variantId,
              attribute_id: attr.attribute_id,
              attribute_value_id: attr.attribute_value_id,
            })),
          });
        }
      }

      return tx.product_variants.findUnique({
        where: { id: variantId },
        include: {
          product_variant_attributes: {
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

    if (validatedData.stock_quantity !== undefined) {
      await syncProductStockFromVariants(id, tenantId).catch((err) => {
        console.error('[Mobile product variants PUT/PATCH] Stock sync error:', err);
      });
    }

    return NextResponse.json(
      mobileSuccess({ variant: updatedVariant, message: 'Variant updated successfully' }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Validation error',
          error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        ),
        { status: 400 },
      );
    }
    console.error('[Mobile product variants PUT/PATCH]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update variant'), { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; variantId: string }> },
) {
  return updateVariant(request, ctx);
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; variantId: string }> },
) {
  return updateVariant(request, ctx);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id, variantId } = await params;

  try {
    const existing = await prisma.product_variants.findFirst({
      where: {
        id: variantId,
        product_id: id,
        tenant_id: tenantId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Variant not found'), { status: 404 });
    }

    await prisma.product_variants.delete({
      where: { id: variantId },
    });

    await syncProductStockFromVariants(id, tenantId).catch((err) => {
      console.error('[Mobile product variants DELETE] Stock sync error:', err);
    });

    return NextResponse.json(
      mobileSuccess({ message: 'Variant deleted successfully' }),
      { status: 200 },
    );
  } catch (error) {
    console.error('[Mobile product variants DELETE]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete variant'), { status: 500 });
  }
}
