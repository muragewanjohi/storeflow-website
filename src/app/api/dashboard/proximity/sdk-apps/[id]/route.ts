import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';

const sdkAppUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.enum(['active', 'revoked']).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant } = await requireProximityStaff();
    const { id } = await context.params;
    const body = sdkAppUpdateSchema.parse(await request.json());
    const existing = await prisma.proximity_sdk_apps.findFirst({
      where: { id, tenant_id: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'SDK key not found' }, { status: 404 });
    }

    const app = await prisma.proximity_sdk_apps.update({
      where: { id },
      data: {
        name: body.name?.trim() || existing.name,
        status: body.status || existing.status,
        updated_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        flavor: true,
        key_prefix: true,
        status: true,
        last_used_at: true,
        created_at: true,
      },
    });
    return NextResponse.json({ data: app });
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
    const existing = await prisma.proximity_sdk_apps.findFirst({
      where: { id, tenant_id: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'SDK key not found' }, { status: 404 });
    }
    await prisma.proximity_sdk_apps.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (error) {
    return jsonError(error);
  }
}
