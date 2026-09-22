import { NextResponse } from 'next/server';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { campaignStats, darkSlots, pauseBillingForDarkVendorSlots } from '@/lib/proximity/service';
import { prisma } from '@/lib/prisma/client';
import { SPOOFING_DISCLOSURE_EN } from '@/lib/proximity/constants';

export async function GET() {
  try {
    const { tenant } = await requireProximityStaff();
    const [stats, dark, paused, live] = await Promise.all([
      campaignStats(tenant.id),
      darkSlots(tenant.id),
      pauseBillingForDarkVendorSlots(tenant.id),
      prisma.proximity_campaigns.count({
        where: { tenant_id: tenant.id, status: { in: ['approved', 'live', 'scheduled'] } },
      }),
    ]);
    return NextResponse.json({
      data: {
        stats,
        live_campaigns: live,
        dark_beacons: dark,
        billing_paused: paused.map((campaign) => campaign.id),
        disclosure: SPOOFING_DISCLOSURE_EN,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
