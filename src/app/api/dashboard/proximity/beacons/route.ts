import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { DUKANEST_PROXIMITY_UUID, isAllowedCp35Tx } from '@/lib/proximity/constants';
import { beaconInputSchema } from '@/lib/proximity/validation';
import { darkSlots } from '@/lib/proximity/service';

export async function GET(request: NextRequest) {
  try {
    const { tenant } = await requireProximityStaff();
    if (request.nextUrl.searchParams.get('dark') === '1') {
      return NextResponse.json({ data: await darkSlots(tenant.id) });
    }
    const beacons = await prisma.proximity_beacons.findMany({
      where: { tenant_id: tenant.id },
      include: { location: { select: { name: true } }, zone: { select: { name: true } } },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json({ data: beacons, platform_uuid: DUKANEST_PROXIMITY_UUID });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenant } = await requireProximityStaff();
    const body = beaconInputSchema.parse(await request.json());
    if (body.tx_power_dbm !== undefined && !isAllowedCp35Tx(body.tx_power_dbm)) {
      return NextResponse.json({ error: 'TX must be a CP35 step' }, { status: 400 });
    }
    const zone = await prisma.proximity_zones.findFirst({
      where: { id: body.zone_id, tenant_id: tenant.id, location_id: body.location_id },
    });
    if (!zone) {
      return NextResponse.json({ error: 'Zone not found on that branch' }, { status: 404 });
    }
    const beacon = await prisma.proximity_beacons.create({
      data: {
        tenant_id: tenant.id,
        location_id: body.location_id,
        zone_id: body.zone_id,
        name: body.name || zone.name,
        mac_address: body.mac_address || null,
        qr_code: body.qr_code || null,
        ibeacon_uuid: (body.ibeacon_uuid || DUKANEST_PROXIMITY_UUID).toLowerCase(),
        major: body.major,
        minor: body.minor,
        tx_power_dbm: body.tx_power_dbm ?? -13.5,
        adv_interval_ms: body.adv_interval_ms ?? 500,
        status: body.status || 'active',
        installed_at: new Date(),
      },
    });
    return NextResponse.json({ data: beacon }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
