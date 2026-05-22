import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import {
  mobileAddProductToSaleSchema,
  mobileUpdateProductSaleSchema,
} from '@/lib/sales/mobile-product-sales-schemas';
import {
  SaleProductError,
  addProductToSale,
  listSaleProducts,
  removeProductFromSale,
  updateSaleProduct,
} from '@/lib/sales/product-sales';

function productIdFromQuery(request: NextRequest): string | null {
  const { searchParams } = new URL(request.url);
  return searchParams.get('productId') ?? searchParams.get('product_id');
}

/**
 * GET    /api/v1/mobile/dashboard/sales/:id/products — list products in sale
 * POST   /api/v1/mobile/dashboard/sales/:id/products — add product
 * PUT    /api/v1/mobile/dashboard/sales/:id/products — update sale price / order
 * PATCH  — same as PUT
 * DELETE /api/v1/mobile/dashboard/sales/:id/products?productId=
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const { id: saleId } = await params;

  try {
    const items = await listSaleProducts(gate.ctx.tenantId, saleId);
    return NextResponse.json(mobileSuccess({ items }), { status: 200 });
  } catch (error) {
    if (error instanceof SaleProductError) {
      return NextResponse.json(mobileError('NOT_FOUND', error.message), { status: error.status });
    }
    console.error('[Mobile Sale Products GET]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch sale products'), {
      status: 500,
    });
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

  const { id: saleId } = await params;

  try {
    const parsed = mobileAddProductToSaleSchema.parse(await request.json());
    const item = await addProductToSale(gate.ctx.tenantId, saleId, parsed);
    return NextResponse.json(mobileSuccess({ item }), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }
    if (error instanceof SaleProductError) {
      return NextResponse.json(mobileError('BAD_REQUEST', error.message), {
        status: error.status,
      });
    }
    console.error('[Mobile Sale Products POST]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to add product to sale'), {
      status: 500,
    });
  }
}

async function updateProduct(request: NextRequest, saleId: string) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  try {
    const { productId, update } = mobileUpdateProductSaleSchema.parse(await request.json());
    const item = await updateSaleProduct(gate.ctx.tenantId, saleId, productId, update);
    return NextResponse.json(mobileSuccess({ item }), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }
    if (error instanceof SaleProductError) {
      return NextResponse.json(mobileError('NOT_FOUND', error.message), { status: error.status });
    }
    console.error('[Mobile Sale Products PUT]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update sale product'), {
      status: 500,
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: saleId } = await params;
  return updateProduct(request, saleId);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: saleId } = await params;
  return updateProduct(request, saleId);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  const { id: saleId } = await params;
  const productId = productIdFromQuery(request);

  if (!productId) {
    return NextResponse.json(
      mobileError('VALIDATION_ERROR', 'productId query parameter is required', [
        { field: 'productId', message: 'Required' },
      ]),
      { status: 400 },
    );
  }

  try {
    await removeProductFromSale(gate.ctx.tenantId, saleId, productId);
    return NextResponse.json(
      mobileSuccess({ message: 'Product removed from sale successfully' }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof SaleProductError) {
      return NextResponse.json(mobileError('NOT_FOUND', error.message), { status: error.status });
    }
    console.error('[Mobile Sale Products DELETE]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to remove product from sale'), {
      status: 500,
    });
  }
}
