import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { campaignInputSchema } from '@/lib/proximity/validation';
import { createCampaignRecord } from '@/lib/proximity/service';
import { SPOOFING_DISCLOSURE_EN } from '@/lib/proximity/constants';

export async function GET(request: NextRequest) {
  try {
    const { tenant } = await requireProximityStaff();
    const status = request.nextUrl.searchParams.get('status');
    const campaigns = await prisma.proximity_campaigns.findMany({
      where: { tenant_id: tenant.id, ...(status ? { status } : {}) },
      include: {
        advertiser: { select: { id: true, name: true } },
        placements: { include: { location: { select: { name: true } }, zone: { select: { name: true } } } },
      },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json({ data: campaigns, disclosure: SPOOFING_DISCLOSURE_EN });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenant } = await requireProximityStaff();
    const body = campaignInputSchema.parse(await request.json());
    const status = body.advertiser_id ? 'submitted' : 'approved';
    const campaign = await createCampaignRecord(tenant.id, body, status);
    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
