import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { isAllowedCp35Tx } from '@/lib/proximity/constants';
import { beaconInputSchema } from '@/lib/proximity/validation';

const beaconUpdateSchema = beaconInputSchema.partial();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant } = await requireProximityStaff();
    const { id } = await context.params;
    const body = beaconUpdateSchema.parse(await request.json());
    const existing = await prisma.proximity_beacons.findFirst({
      where: { id, tenant_id: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Beacon not found' }, { status: 404 });
    }

    let locationId = existing.location_id;
    let zoneId = existing.zone_id;
    if (body.zone_id) {
      const zone = await prisma.proximity_zones.findFirst({
        where: { id: body.zone_id, tenant_id: tenant.id },
      });
      if (!zone) {
        return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
      }
      if (body.location_id && body.location_id !== zone.location_id) {
        return NextResponse.json({ error: 'Zone not found on that branch' }, { status: 404 });
      }
      zoneId = zone.id;
      locationId = zone.location_id;
    }

    if (body.tx_power_dbm !== undefined && !isAllowedCp35Tx(body.tx_power_dbm)) {
      return NextResponse.json({ error: 'TX must be a CP35 step' }, { status: 400 });
    }

    const beacon = await prisma.proximity_beacons.update({
      where: { id },
      data: {
        location_id: locationId,
        zone_id: zoneId,
        name: body.name === undefined ? existing.name : body.name || null,
        mac_address: body.mac_address === undefined ? existing.mac_address : body.mac_address || null,
        major: body.major ?? existing.major,
        minor: body.minor ?? existing.minor,
        tx_power_dbm: body.tx_power_dbm ?? existing.tx_power_dbm,
        adv_interval_ms: body.adv_interval_ms ?? existing.adv_interval_ms,
        status: body.status || existing.status,
        updated_at: new Date(),
      },
    });
    return NextResponse.json({ data: beacon });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant } = await requireProximityStaff();
    const { id } = await context.params;
    const existing = await prisma.proximity_beacons.findFirst({
      where: { id, tenant_id: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Beacon not found' }, { status: 404 });
    }
    await prisma.proximity_beacons.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (error) {
    return jsonError(error);
  }
}
