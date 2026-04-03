import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { updateProductSchema, generateSlug } from '@/lib/products/validation';
import { getProductCachePatterns } from '@/lib/cache/product-cache-keys';
import { deleteCachePattern } from '@/lib/cache/redis';

async function invalidateProductCaches(tenantId: string) {
  try {
    revalidateTag(`products-${tenantId}`);
    revalidateTag(`products-count-${tenantId}`);
    revalidateTag(`products-ratings-${tenantId}`);
    for (const pattern of getProductCachePatterns(tenantId)) {
      await deleteCachePattern(pattern);
    }
  } catch (e) {
    console.warn('[Mobile product] cache invalidate', e);
  }
}

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
      include: {
        product_variants: {
          select: {
            id: true,
            attribute_id: true,
            attribute_value_id: true,
            price: true,
            stock_quantity: true,
            sku: true,
            image: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Product not found'), { status: 404 });
    }

    return NextResponse.json(mobileSuccess({ product }), { status: 200 });
  } catch (e) {
    console.error('[Mobile product GET]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch product'), { status: 500 });
  }
}

async function updateProduct(request: NextRequest, params: Promise<{ id: string }>) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const body = await request.json();
    const validatedData = updateProductSchema.parse(body);

    const existingProduct = await prisma.products.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existingProduct) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Product not found'), { status: 404 });
    }

    let slug = existingProduct.slug;
    if (validatedData.name && validatedData.name !== existingProduct.name) {
      slug = validatedData.slug || generateSlug(validatedData.name);
      const slugExists = await prisma.products.findFirst({
        where: { tenant_id: tenantId, slug, id: { not: id } },
      });
      if (slugExists) {
        return NextResponse.json(mobileError('CONFLICT', 'A product with this slug already exists'), {
          status: 409,
        });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (slug !== existingProduct.slug) updateData.slug = slug;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.short_description !== undefined) {
      updateData.short_description = validatedData.short_description;
    }
    if (validatedData.price !== undefined) updateData.price = validatedData.price;
    if (validatedData.sale_price !== undefined) updateData.sale_price = validatedData.sale_price;
    if (validatedData.sku !== undefined) updateData.sku = validatedData.sku;
    if (validatedData.stock_quantity !== undefined) updateData.stock_quantity = validatedData.stock_quantity;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (validatedData.image !== undefined) updateData.image = validatedData.image;
    if (validatedData.gallery !== undefined) updateData.gallery = validatedData.gallery;
    if (validatedData.category_id !== undefined) updateData.category_id = validatedData.category_id;
    if (validatedData.brand_id !== undefined) updateData.brand_id = validatedData.brand_id;
    if (validatedData.metadata !== undefined) updateData.metadata = validatedData.metadata;
    if (validatedData.estimated_delivery_days !== undefined) {
      updateData.estimated_delivery_days = validatedData.estimated_delivery_days;
    }

    const product = await prisma.products.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.products.update>[0]['data'],
    });

    try {
      await prisma.$executeRaw`
        UPDATE products
        SET search_vector =
          setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(sku, '')), 'A')
        WHERE id = ${id}::uuid
      `;
    } catch (searchVectorError) {
      console.warn('[Mobile product] search_vector', searchVectorError);
    }

    await invalidateProductCaches(tenantId);

    return NextResponse.json(
      mobileSuccess({ message: 'Product updated successfully', product }),
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Validation error',
          e.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        ),
        { status: 400 },
      );
    }
    console.error('[Mobile product PUT/PATCH]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update product'), { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return updateProduct(request, ctx.params);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return updateProduct(request, ctx.params);
}

export async function DELETE(
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
    const product = await prisma.products.findFirst({ where: { id, tenant_id: tenantId } });
    if (!product) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Product not found'), { status: 404 });
    }

    await prisma.products.delete({ where: { id } });
    await invalidateProductCaches(tenantId);

    return NextResponse.json(mobileSuccess({ message: 'Product deleted successfully' }), { status: 200 });
  } catch (e) {
    console.error('[Mobile product DELETE]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete product'), { status: 500 });
  }
}
