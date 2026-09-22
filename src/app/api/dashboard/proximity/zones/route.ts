import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { slugify } from '@/lib/proximity/engine';
import { zoneInputSchema } from '@/lib/proximity/validation';

export async function GET(request: NextRequest) {
  try {
    const { tenant } = await requireProximityStaff();
    const locationId = request.nextUrl.searchParams.get('location_id');
    const zones = await prisma.proximity_zones.findMany({
      where: { tenant_id: tenant.id, ...(locationId ? { location_id: locationId } : {}) },
      include: { location: { select: { name: true } }, _count: { select: { beacons: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ data: zones });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenant } = await requireProximityStaff();
    const body = zoneInputSchema.parse(await request.json());
    const location = await prisma.proximity_locations.findFirst({
      where: { id: body.location_id, tenant_id: tenant.id },
    });
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }
    const duplicate = await prisma.proximity_zones.findFirst({
      where: {
        location_id: location.id,
        name: { equals: body.name.trim(), mode: 'insensitive' },
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `Zone "${duplicate.name}" already exists on ${location.name}.` },
        { status: 409 }
      );
    }
    const baseSlug = body.slug || slugify(body.name);
    let slug = baseSlug;
    for (let n = 2; n < 50; n += 1) {
      const taken = await prisma.proximity_zones.findFirst({
        where: { location_id: location.id, slug },
        select: { id: true },
      });
      if (!taken) break;
      slug = `${baseSlug.slice(0, 76)}-${n}`;
    }
    const zone = await prisma.proximity_zones.create({
      data: {
        tenant_id: tenant.id,
        location_id: body.location_id,
        name: body.name.trim(),
        slug,
        kind: body.kind || 'department',
        status: body.status || 'active',
      },
    });
    return NextResponse.json({ data: zone }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
