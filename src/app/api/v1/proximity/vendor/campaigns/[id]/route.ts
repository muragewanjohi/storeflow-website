import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonError, requireAdvertiser } from '@/lib/proximity/http';
import { campaignStats } from '@/lib/proximity/service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const advertiser = await requireAdvertiser(request);
    const { id } = await context.params;
    const campaign = await prisma.proximity_campaigns.findFirst({
      where: { id, tenant_id: advertiser.tenant_id, advertiser_id: advertiser.id },
      include: {
        placements: { include: { location: { select: { name: true } }, zone: { select: { name: true } } } },
      },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const stats = await campaignStats(advertiser.tenant_id, id, advertiser.id);
    return NextResponse.json({ data: campaign, stats });
  } catch (error) {
    return jsonError(error);
  }
}
