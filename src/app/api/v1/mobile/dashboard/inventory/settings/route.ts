import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import {
  getInventorySettingsForTenant,
  updateInventorySettingsForTenant,
} from '@/lib/inventory/operations';
import { mobileInventorySettingsSchema } from '@/lib/inventory/mobile-schemas';

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const settings = await getInventorySettingsForTenant(gate.ctx.tenantId);
    return NextResponse.json(mobileSuccess(settings), { status: 200 });
  } catch (error) {
    console.error('[Mobile inventory settings GET]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch inventory settings'), {
      status: 500,
    });
  }
}

export async function PUT(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  try {
    const { threshold } = mobileInventorySettingsSchema.parse(await request.json());
    const settings = await updateInventorySettingsForTenant(gate.ctx.tenantId, threshold);
    return NextResponse.json(mobileSuccess(settings), { status: 200 });
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
    console.error('[Mobile inventory settings PUT]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update inventory settings'), {
      status: 500,
    });
  }
}

export async function PATCH(request: NextRequest) {
  return PUT(request);
}
