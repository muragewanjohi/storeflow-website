import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { locationInputSchema } from '@/lib/proximity/validation';
import { assertNoActivePlacements, uniqueLocationSlug } from '@/lib/proximity/service';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant } = await requireProximityStaff();
    const { id } = await context.params;
    const body = locationInputSchema.partial().parse(await request.json());
    const existing = await prisma.proximity_locations.findFirst({
      where: { id, tenant_id: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    const nextName = body.name?.trim();
    if (nextName && nextName.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await prisma.proximity_locations.findFirst({
        where: {
          tenant_id: tenant.id,
          id: { not: id },
          name: { equals: nextName, mode: 'insensitive' },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `Branch "${duplicate.name}" already exists.` },
          { status: 409 }
        );
      }
    }

    const location = await prisma.proximity_locations.update({
      where: { id },
      data: {
        name: nextName || existing.name,
        address: body.address === undefined ? existing.address : body.address || null,
        timezone: body.timezone || existing.timezone,
        status: body.status || existing.status,
        slug: nextName ? await uniqueLocationSlug(tenant.id, nextName, id) : existing.slug,
        updated_at: new Date(),
      },
    });
    return NextResponse.json({ data: location });
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
    const existing = await prisma.proximity_locations.findFirst({
      where: { id, tenant_id: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }
    await assertNoActivePlacements({ tenantId: tenant.id, locationId: id });
    await prisma.proximity_locations.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (error) {
    return jsonError(error);
  }
}
