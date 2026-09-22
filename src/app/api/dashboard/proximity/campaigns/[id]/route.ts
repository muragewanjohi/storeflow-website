import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { campaignStats, updateCampaignRecord } from '@/lib/proximity/service';
import { campaignInputSchema } from '@/lib/proximity/validation';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant } = await requireProximityStaff();
    const { id } = await context.params;
    const campaign = await prisma.proximity_campaigns.findFirst({
      where: { id, tenant_id: tenant.id },
      include: {
        advertiser: true,
        placements: { include: { location: true, zone: true } },
      },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const stats = await campaignStats(tenant.id, id);
    return NextResponse.json({ data: campaign, stats });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant } = await requireProximityStaff();
    const { id } = await context.params;
    const body = campaignInputSchema.parse(await request.json());
    const campaign = await updateCampaignRecord(tenant.id, id, body);
    return NextResponse.json({ data: campaign });
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
    const existing = await prisma.proximity_campaigns.findFirst({
      where: { id, tenant_id: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (['live', 'scheduled', 'approved'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'End or pause this campaign before deleting it.' },
        { status: 409 }
      );
    }
    await prisma.proximity_campaigns.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (error) {
    return jsonError(error);
  }
}
