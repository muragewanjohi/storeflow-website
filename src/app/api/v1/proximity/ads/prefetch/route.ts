import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireScanSdk } from '@/lib/proximity/http';
import { prisma } from '@/lib/prisma/client';
import { PRIVACY_COPY_EN } from '@/lib/proximity/constants';

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireScanSdk(request);
    const now = new Date();
    const campaigns = await prisma.proximity_campaigns.findMany({
      where: {
        tenant_id: tenantId,
        billing_paused: false,
        status: { in: ['approved', 'live', 'scheduled'] },
        starts_at: { lte: now },
        ends_at: { gte: now },
      },
      select: {
        id: true,
        headline: true,
        body: true,
        image_url: true,
        cta_label: true,
        cta_url: true,
        coupon_enabled: true,
        coupon_label: true,
        dwell_ms: true,
        placements: { select: { location_id: true, zone_id: true } },
      },
    });
    return NextResponse.json({
      data: campaigns,
      privacy_copy: PRIVACY_COPY_EN,
      cache_ttl_seconds: 300,
    });
  } catch (error) {
    return jsonError(error);
  }
}
