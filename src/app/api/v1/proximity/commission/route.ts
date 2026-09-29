import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireCommissionSdk } from '@/lib/proximity/http';
import { prisma } from '@/lib/prisma/client';
import { commissionBodySchema, commissionUpdate } from '@/lib/proximity/commission-profile';

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireCommissionSdk(request);
    const body = commissionBodySchema.parse(await request.json());
    const beacon = await prisma.proximity_beacons.findFirst({
      where: { id: body.beacon_id, tenant_id: tenantId },
    });
    if (!beacon) {
      return NextResponse.json({ error: 'Beacon not found' }, { status: 404 });
    }
    const updated = await prisma.proximity_beacons.update({
      where: { id: beacon.id },
      data: commissionUpdate(beacon, body),
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return jsonError(error);
  }
}
