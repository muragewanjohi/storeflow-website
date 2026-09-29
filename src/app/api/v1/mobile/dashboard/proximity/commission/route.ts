import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { commissionBodySchema, commissionUpdate } from '@/lib/proximity/commission-profile';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);
    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(mobileError('FORBIDDEN', 'Staff only'), { status: 403 });
    }
    if (!user.tenant_id) {
      return NextResponse.json(mobileError('FORBIDDEN', 'Tenant missing'), { status: 403 });
    }
    const body = commissionBodySchema.parse(await request.json());
    const beacon = await prisma.proximity_beacons.findFirst({
      where: { id: body.beacon_id, tenant_id: user.tenant_id },
    });
    if (!beacon) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Beacon not found'), { status: 404 });
    }
    const updated = await prisma.proximity_beacons.update({
      where: { id: beacon.id },
      data: commissionUpdate(beacon, body),
    });
    return NextResponse.json(mobileSuccess(updated));
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(mobileError('VALIDATION_ERROR', error.issues[0]?.message || 'Invalid profile'), {
        status: 400,
      });
    }
    const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status: number }).status) : 401;
    const message = error instanceof Error ? error.message : 'Request failed';
    return NextResponse.json(mobileError(status === 400 ? 'BAD_REQUEST' : 'UNAUTHORIZED', message), {
      status: Number.isFinite(status) && status >= 400 ? status : 401,
    });
  }
}
