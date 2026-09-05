import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import { bulkUpdateInventoryForTenant } from '@/lib/inventory/operations';
import {
  mobileBulkInventorySchema,
  toBulkInventoryInput,
} from '@/lib/inventory/mobile-schemas';

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  try {
    const parsed = mobileBulkInventorySchema.parse(await request.json());
    const { results, errors } = await bulkUpdateInventoryForTenant(
      gate.ctx.tenantId,
      gate.ctx.user.id,
      toBulkInventoryInput(parsed),
    );

    return NextResponse.json(
      mobileSuccess({
        processed: results.length,
        errorCount: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200 },
    );
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
    console.error('[Mobile inventory bulk]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update inventory'), {
      status: 500,
    });
  }
}
