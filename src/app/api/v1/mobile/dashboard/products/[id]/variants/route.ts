import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { generateSKU } from '@/lib/products/validation';
import { syncProductStockFromVariants } from '@/lib/inventory/sync-product-stock';

const variantAttributeSchema = z.object({
  attribute_id: z.string().uuid(),
  attribute_value_id: z.string().uuid(),
});

const createVariantSchema = z.object({
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
  stock_quantity: z.number().int().min(0).default(0).optional(),
  sku: z.string().max(100).optional().nullable(),
  image: z.string().url().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const product = await prisma.products.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Product not found'), { status: 404 });
    }

    const variants = await prisma.product_variants.findMany({
      where: {
        product_id: id,
        tenant_id: tenantId,
      },
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
      orderBy: {
        created_at: 'asc',
      },
    });

    return NextResponse.json(mobileSuccess({ variants }), { status: 200 });
  } catch (error) {
    console.error('[Mobile product variants GET]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch variants'), { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const body = await request.json();
    const validatedData = createVariantSchema.parse(body);

    const product = await prisma.products.findFirst({
      where: {
        id,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!product) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Product not found'), { status: 404 });
    }

    // Determine which attributes to persist.
    let attributesToCreate: Array<{ attribute_id: string; attribute_value_id: string }> = [];
    if (validatedData.attributes && validatedData.attributes.length > 0) {
      attributesToCreate = validatedData.attributes;
    } else if (validatedData.attribute_id && validatedData.attribute_value_id) {
      attributesToCreate = [
        {
          attribute_id: validatedData.attribute_id,
          attribute_value_id: validatedData.attribute_value_id,
        },
      ];
    }

    let sku = validatedData.sku || generateSKU(product.name, tenantId);
    const existingSku = await prisma.product_variants.findFirst({
      where: { tenant_id: tenantId, sku },
      select: { id: true },
    });
    if (existingSku) {
      sku = generateSKU(product.name, tenantId);
    }

    const variant = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newVariant = await tx.product_variants.create({
        data: {
          tenant_id: tenantId,
          product_id: id,
          // Legacy fields retained for compatibility
          attribute_id: validatedData.attribute_id || null,
          attribute_value_id: validatedData.attribute_value_id || null,
          price: validatedData.price || null,
          stock_quantity: validatedData.stock_quantity || 0,
          sku: sku || null,
          image: validatedData.image || null,
        },
      });

      if (attributesToCreate.length > 0) {
        await tx.product_variant_attributes.createMany({
          data: attributesToCreate.map((attr) => ({
            tenant_id: tenantId,
            variant_id: newVariant.id,
            attribute_id: attr.attribute_id,
            attribute_value_id: attr.attribute_value_id,
          })),
        });
      }

      return tx.product_variants.findUnique({
        where: { id: newVariant.id },
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

    await syncProductStockFromVariants(id, tenantId).catch((err) => {
      console.error('[Mobile product variants POST] Stock sync error:', err);
    });

    return NextResponse.json(
      mobileSuccess({ variant, message: 'Variant created successfully' }),
      { status: 201 },
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
    console.error('[Mobile product variants POST]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to create variant'), { status: 500 });
  }
}
