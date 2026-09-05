/**
 * Product Sales API Route
 *
 * GET / POST / PUT / DELETE /api/dashboard/sales/:id/products
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { addProductToSaleSchema, updateProductSaleSchema } from '@/lib/sales/validation';
import {
  SaleProductError,
  addProductToSale,
  listSaleProducts,
  removeProductFromSale,
  saleProductToWebJson,
  updateSaleProduct,
} from '@/lib/sales/product-sales';
import { z } from 'zod';

async function requireTenantUser(request: NextRequest) {
  const user = await requireAuth();
  const tenant = await requireTenant();
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  if (user.tenant_id !== tenant.id) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) };
  }

  return { ok: true as const, tenantId: tenant.id };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireTenantUser(request);
    if (!auth.ok) return auth.response;

    const { id: saleId } = await params;
    const products = await listSaleProducts(auth.tenantId, saleId);

    return NextResponse.json({
      products: products.map(saleProductToWebJson),
    });
  } catch (error) {
    if (error instanceof SaleProductError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching sale products:', error);
    return NextResponse.json({ error: 'Failed to fetch sale products' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireTenantUser(request);
    if (!auth.ok) return auth.response;

    const { id: saleId } = await params;
    const validatedData = addProductToSaleSchema.parse(await request.json());
    const item = await addProductToSale(auth.tenantId, saleId, validatedData);

    return NextResponse.json({ product_sale: saleProductToWebJson(item) }, { status: 201 });
  } catch (error) {
    if (error instanceof SaleProductError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', issues: error.issues }, { status: 400 });
    }
    console.error('Error adding product to sale:', error);
    return NextResponse.json({ error: 'Failed to add product to sale' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireTenantUser(request);
    if (!auth.ok) return auth.response;

    const { id: saleId } = await params;
    const body = await request.json();
    const { product_id, ...updateData } = body;

    if (!product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
    }

    const validatedData = updateProductSaleSchema.parse(updateData);
    const item = await updateSaleProduct(auth.tenantId, saleId, product_id, validatedData);

    return NextResponse.json({ product_sale: saleProductToWebJson(item) });
  } catch (error) {
    if (error instanceof SaleProductError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', issues: error.issues }, { status: 400 });
    }
    console.error('Error updating product sale:', error);
    return NextResponse.json({ error: 'Failed to update product sale' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireTenantUser(request);
    if (!auth.ok) return auth.response;

    const { id: saleId } = await params;
    const productId = new URL(request.url).searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json({ error: 'product_id query parameter is required' }, { status: 400 });
    }

    await removeProductFromSale(auth.tenantId, saleId, productId);

    return NextResponse.json({ message: 'Product removed from sale successfully' }, { status: 200 });
  } catch (error) {
    if (error instanceof SaleProductError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error removing product from sale:', error);
    return NextResponse.json({ error: 'Failed to remove product from sale' }, { status: 500 });
  }
}
