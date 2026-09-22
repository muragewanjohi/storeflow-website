import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/proximity/http';
import { prisma } from '@/lib/prisma/client';
import { PRIVACY_COPY_EN, SPOOFING_DISCLOSURE_EN } from '@/lib/proximity/constants';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await context.params;
    const campaign = await prisma.proximity_campaigns.findFirst({
      where: {
        id: campaignId,
        status: { in: ['approved', 'live', 'scheduled'] },
        billing_paused: false,
      },
      select: {
        id: true,
        headline: true,
        body: true,
        image_url: true,
        cta_label: true,
        coupon_enabled: true,
        coupon_label: true,
        tenant_id: true,
      },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }
    return NextResponse.json({
      data: campaign,
      source: 'qr',
      privacy_copy: PRIVACY_COPY_EN,
      spoofing_disclosure: SPOOFING_DISCLOSURE_EN,
    });
  } catch (error) {
    return jsonError(error);
  }
}
