import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { getInventoryHistoryForTenant } from '@/lib/inventory/operations';

function parseQueryParams(searchParams: URLSearchParams) {
  const get = (key: string) => searchParams.get(key) ?? undefined;
  const queryParams: Record<string, unknown> = {};

  for (const [key, value] of searchParams.entries()) {
    if (key === 'page' || key === 'limit' || key === 'threshold') {
      queryParams[key] = parseInt(value, 10) || (key === 'page' ? 1 : key === 'limit' ? 20 : 10);
    } else if (key === 'low_stock_only' || key === 'lowStockOnly') {
      queryParams.low_stock_only = value === 'true';
    } else if (key === 'product_id' || key === 'productId') {
      queryParams.product_id = value;
    } else if (key === 'variant_id' || key === 'variantId') {
      queryParams.variant_id = value;
    } else if (key === 'adjustment_type' || key === 'adjustmentType') {
      queryParams.adjustment_type = value;
    } else {
      queryParams[key] = value;
    }
  }

  if (get('productId') && !queryParams.product_id) queryParams.product_id = get('productId');
  if (get('variantId') && !queryParams.variant_id) queryParams.variant_id = get('variantId');
  if (get('adjustmentType') && !queryParams.adjustment_type) {
    queryParams.adjustment_type = get('adjustmentType');
  }

  return queryParams;
}

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(request.url);
    const result = await getInventoryHistoryForTenant(gate.ctx.tenantId, parseQueryParams(searchParams));
    return NextResponse.json(mobileSuccess(result), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid query parameters',
          error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        ),
        { status: 400 },
      );
    }
    console.error('[Mobile inventory history]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch inventory history'), {
      status: 500,
    });
  }
}
