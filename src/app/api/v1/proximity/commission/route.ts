import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireCommissionSdk } from '@/lib/proximity/http';
import { prisma } from '@/lib/prisma/client';
import { DUKANEST_PROXIMITY_UUID, CP35_TX_STEPS_DBM, isAllowedCp35Tx } from '@/lib/proximity/constants';
import { z } from 'zod';

const bodySchema = z.object({
  beacon_id: z.string().uuid(),
  uuid: z.string().uuid().optional(),
  major: z.number().int().min(0).max(65535).optional(),
  minor: z.number().int().min(0).max(65535).optional(),
  tx_power_dbm: z.number().optional(),
  adv_interval_ms: z.number().int().min(100).max(1500).optional(),
  battery_mv: z.number().int().optional(),
  last_seen_at: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireCommissionSdk(request);
    const body = bodySchema.parse(await request.json());
    if (body.tx_power_dbm !== undefined && !isAllowedCp35Tx(body.tx_power_dbm)) {
      return NextResponse.json({ error: `TX must be one of ${CP35_TX_STEPS_DBM.join(', ')}` }, { status: 400 });
    }
    const beacon = await prisma.proximity_beacons.findFirst({
      where: { id: body.beacon_id, tenant_id: tenantId },
    });
    if (!beacon) {
      return NextResponse.json({ error: 'Beacon not found' }, { status: 404 });
    }
    const updated = await prisma.proximity_beacons.update({
      where: { id: beacon.id },
      data: {
        ibeacon_uuid: (body.uuid || DUKANEST_PROXIMITY_UUID).toLowerCase(),
        major: body.major ?? beacon.major,
        minor: body.minor ?? beacon.minor,
        tx_power_dbm: body.tx_power_dbm ?? beacon.tx_power_dbm,
        adv_interval_ms: body.adv_interval_ms ?? beacon.adv_interval_ms,
        battery_mv: body.battery_mv ?? beacon.battery_mv,
        last_seen_at: body.last_seen_at ? new Date(body.last_seen_at) : new Date(),
        updated_at: new Date(),
      },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return jsonError(error);
  }
}
