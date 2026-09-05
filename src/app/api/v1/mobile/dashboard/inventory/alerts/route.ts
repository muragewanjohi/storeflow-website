import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { getInventoryAlertsForTenant } from '@/lib/inventory/operations';

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(request.url);
    const thresholdRaw = searchParams.get('threshold') ?? searchParams.get('lowStockThreshold');
    const queryInput: Record<string, unknown> = {};
    if (thresholdRaw) {
      queryInput.threshold = parseInt(thresholdRaw, 10) || 10;
    }

    const alerts = await getInventoryAlertsForTenant(gate.ctx.tenantId, queryInput);
    return NextResponse.json(mobileSuccess(alerts), { status: 200 });
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
    console.error('[Mobile inventory alerts]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch inventory alerts'), {
      status: 500,
    });
  }
}
