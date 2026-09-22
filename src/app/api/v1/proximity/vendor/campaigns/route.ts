import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireAdvertiser } from '@/lib/proximity/http';
import { campaignInputSchema } from '@/lib/proximity/validation';
import { campaignStats, createCampaignRecord } from '@/lib/proximity/service';
import { prisma } from '@/lib/prisma/client';
import { SPOOFING_DISCLOSURE_EN } from '@/lib/proximity/constants';

export async function GET(request: NextRequest) {
  try {
    const advertiser = await requireAdvertiser(request);
    const campaigns = await prisma.proximity_campaigns.findMany({
      where: { tenant_id: advertiser.tenant_id, advertiser_id: advertiser.id },
      include: {
        placements: { include: { location: { select: { name: true } }, zone: { select: { name: true } } } },
      },
      orderBy: { created_at: 'desc' },
    });
    const stats = await campaignStats(advertiser.tenant_id, undefined, advertiser.id);
    return NextResponse.json({ data: campaigns, stats, disclosure: SPOOFING_DISCLOSURE_EN });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const advertiser = await requireAdvertiser(request);
    const body = campaignInputSchema.parse(await request.json());
    if (!body.terms_accepted) {
      return NextResponse.json({ error: 'Accept the measurement disclosure before booking.' }, { status: 400 });
    }
    const campaign = await createCampaignRecord(
      advertiser.tenant_id,
      { ...body, advertiser_id: advertiser.id },
      'submitted'
    );
    return NextResponse.json({ data: campaign, next: 'Retailer must approve before the ad can go live.' }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
