import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { zoneInputSchema } from '@/lib/proximity/validation';
import { assertNoActivePlacements, uniqueZoneSlug } from '@/lib/proximity/service';

const zoneUpdateSchema = zoneInputSchema.partial().extend({
  location_id: zoneInputSchema.shape.location_id.optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant } = await requireProximityStaff();
    const { id } = await context.params;
    const body = zoneUpdateSchema.parse(await request.json());
    const existing = await prisma.proximity_zones.findFirst({
      where: { id, tenant_id: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    const nextLocationId = body.location_id || existing.location_id;
    if (nextLocationId !== existing.location_id) {
      const location = await prisma.proximity_locations.findFirst({
        where: { id: nextLocationId, tenant_id: tenant.id },
      });
      if (!location) {
        return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
      }
    }

    const nextName = body.name?.trim() || existing.name;
    const duplicate = await prisma.proximity_zones.findFirst({
      where: {
        location_id: nextLocationId,
        id: { not: id },
        name: { equals: nextName, mode: 'insensitive' },
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `Zone "${duplicate.name}" already exists on that branch.` },
        { status: 409 }
      );
    }

    const zone = await prisma.proximity_zones.update({
      where: { id },
      data: {
        location_id: nextLocationId,
        name: nextName,
        kind: body.kind || existing.kind,
        status: body.status || existing.status,
        slug: await uniqueZoneSlug(nextLocationId, nextName, id),
        updated_at: new Date(),
      },
    });
    return NextResponse.json({ data: zone });
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
    const existing = await prisma.proximity_zones.findFirst({
      where: { id, tenant_id: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }
    await assertNoActivePlacements({ tenantId: tenant.id, zoneId: id });
    await prisma.proximity_zones.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (error) {
    return jsonError(error);
  }
}
