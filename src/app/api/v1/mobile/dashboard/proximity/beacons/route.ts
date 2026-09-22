import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { DUKANEST_PROXIMITY_UUID } from '@/lib/proximity/constants';
import { darkSlots } from '@/lib/proximity/service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);
    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(mobileError('FORBIDDEN', 'Staff only'), { status: 403 });
    }
    if (!user.tenant_id) {
      return NextResponse.json(mobileError('FORBIDDEN', 'Tenant missing'), { status: 403 });
    }
    const beacons = await prisma.proximity_beacons.findMany({
      where: { tenant_id: user.tenant_id },
      include: { location: { select: { name: true } }, zone: { select: { name: true } } },
      orderBy: { created_at: 'desc' },
    });
    const dark = await darkSlots(user.tenant_id);
    return NextResponse.json(
      mobileSuccess({
        platform_uuid: DUKANEST_PROXIMITY_UUID,
        beacons,
        dark_beacon_ids: dark.map((beacon) => beacon.id),
        commissioning: 'Pilot: configure TX/UUID in DX-SMART, then register the beacon on web dashboard.',
      })
    );
  } catch (error) {
    return NextResponse.json(
      mobileError('UNAUTHORIZED', error instanceof Error ? error.message : 'Auth failed'),
      { status: 401 }
    );
  }
}
