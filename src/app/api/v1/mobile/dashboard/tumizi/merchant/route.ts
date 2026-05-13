import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import { tumiziClient } from '@/lib/tumizi/client';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';
import {
  getErrorMessage,
  getErrorStatus,
  getTumiziMerchantExternalIdOrThrow,
  updateTumiziMerchantSchema,
} from '@/lib/tumizi/mobile-route-helpers';

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const config = await getTumiziTenantConfigByTenantId(gate.ctx.tenantId);
    const merchantExternalId = getTumiziMerchantExternalIdOrThrow(config);

    const [merchant, wallet] = await Promise.all([
      tumiziClient.getMerchant(merchantExternalId),
      tumiziClient.getMerchantWallet(merchantExternalId).catch(() => null),
    ]);

    return NextResponse.json(
      mobileSuccess({
        merchantExternalId,
        merchant,
        wallet,
      }),
      { status: 200 },
    );
  } catch (error) {
    const status = getErrorStatus(error);
    console.error('[Mobile Tumizi merchant GET]', error);
    return NextResponse.json(
      mobileError(
        status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
        getErrorMessage(error, 'Failed to fetch Tumizi merchant details'),
      ),
      { status },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  if (gate.ctx.user.role !== 'tenant_admin') {
    return NextResponse.json(
      mobileError('FORBIDDEN', 'Only the store owner can update Tumizi merchant details'),
      { status: 403 },
    );
  }

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  try {
    const config = await getTumiziTenantConfigByTenantId(gate.ctx.tenantId);
    const merchantExternalId = getTumiziMerchantExternalIdOrThrow(config);
    const payload = updateTumiziMerchantSchema.parse(await request.json());
    const updated = await tumiziClient.updateMerchant(merchantExternalId, payload);

    return NextResponse.json(mobileSuccess(updated), { status: 200 });
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

    const status = getErrorStatus(error);
    console.error('[Mobile Tumizi merchant PATCH]', error);
    return NextResponse.json(
      mobileError(
        status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
        getErrorMessage(error, 'Failed to update Tumizi merchant details'),
      ),
      { status },
    );
  }
}

export async function PUT(request: NextRequest) {
  return PATCH(request);
}
