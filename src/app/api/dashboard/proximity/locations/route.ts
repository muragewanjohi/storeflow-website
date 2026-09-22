import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { slugify } from '@/lib/proximity/engine';
import { locationInputSchema } from '@/lib/proximity/validation';

export async function GET() {
  try {
    const { tenant } = await requireProximityStaff();
    const locations = await prisma.proximity_locations.findMany({
      where: { tenant_id: tenant.id },
      include: { _count: { select: { zones: true, beacons: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ data: locations });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenant } = await requireProximityStaff();
    const body = locationInputSchema.parse(await request.json());
    const duplicate = await prisma.proximity_locations.findFirst({
      where: { tenant_id: tenant.id, name: { equals: body.name.trim(), mode: 'insensitive' } },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `Branch "${duplicate.name}" already exists. Use a different name for another store.` },
        { status: 409 }
      );
    }
    const baseSlug = body.slug || slugify(body.name);
    let slug = baseSlug;
    for (let n = 2; n < 50; n += 1) {
      const taken = await prisma.proximity_locations.findFirst({
        where: { tenant_id: tenant.id, slug },
        select: { id: true },
      });
      if (!taken) break;
      slug = `${baseSlug.slice(0, 76)}-${n}`;
    }
    const location = await prisma.proximity_locations.create({
      data: {
        tenant_id: tenant.id,
        name: body.name.trim(),
        slug,
        address: body.address || null,
        timezone: body.timezone || 'Africa/Nairobi',
        status: body.status || 'active',
      },
    });
    return NextResponse.json({ data: location }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
