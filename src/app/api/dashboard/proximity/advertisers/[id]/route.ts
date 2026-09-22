import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { advertiserInputSchema } from '@/lib/proximity/validation';

const advertiserUpdateSchema = advertiserInputSchema.partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant } = await requireProximityStaff();
    const { id } = await context.params;
    const body = advertiserUpdateSchema.parse(await request.json());
    const existing = await prisma.proximity_advertisers.findFirst({
      where: { id, tenant_id: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const advertiser = await prisma.proximity_advertisers.update({
      where: { id },
      data: {
        name: body.name?.trim() || existing.name,
        email: body.email === undefined ? existing.email : body.email || null,
        phone: body.phone === undefined ? existing.phone : body.phone || null,
        notes: body.notes === undefined ? existing.notes : body.notes || null,
        status: body.status || existing.status,
        updated_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        notes: true,
        created_at: true,
      },
    });
    return NextResponse.json({ data: advertiser });
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
    const existing = await prisma.proximity_advertisers.findFirst({
      where: { id, tenant_id: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    const activeCampaigns = await prisma.proximity_campaigns.count({
      where: {
        tenant_id: tenant.id,
        advertiser_id: id,
        status: { in: ['submitted', 'approved', 'scheduled', 'live'] },
      },
    });
    if (activeCampaigns > 0) {
      return NextResponse.json(
        { error: 'This vendor has an active campaign. End or move that campaign first.' },
        { status: 409 }
      );
    }
    await prisma.proximity_advertisers.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (error) {
    return jsonError(error);
  }
}
