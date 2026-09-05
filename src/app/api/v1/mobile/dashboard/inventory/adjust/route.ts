import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import {
  InventoryOperationError,
  adjustInventoryForTenant,
} from '@/lib/inventory/operations';
import {
  mobileInventoryAdjustmentSchema,
  toInventoryAdjustmentInput,
} from '@/lib/inventory/mobile-schemas';

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  try {
    const parsed = mobileInventoryAdjustmentSchema.parse(await request.json());
    const adjustment = await adjustInventoryForTenant(
      gate.ctx.tenantId,
      gate.ctx.user.id,
      toInventoryAdjustmentInput(parsed),
    );

    return NextResponse.json(mobileSuccess({ adjustment }), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid payload',
          error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        ),
        { status: 400 },
      );
    }
    if (error instanceof InventoryOperationError) {
      const code = error.status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR';
      return NextResponse.json(mobileError(code, error.message), { status: error.status });
    }
    console.error('[Mobile inventory adjust]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to adjust inventory'), {
      status: 500,
    });
  }
}
