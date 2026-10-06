import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { pauseBillingForDarkVendorSlots, proximityOverview } from '@/lib/proximity/service';
import { SPOOFING_DISCLOSURE_EN } from '@/lib/proximity/constants';

export async function GET(request: NextRequest) {
  try {
    const { tenant } = await requireProximityStaff();
    const params = request.nextUrl.searchParams;
    const [overview, paused] = await Promise.all([
      proximityOverview(tenant.id, {
        range: params.get('range'),
        locationId: params.get('location_id'),
      }),
      pauseBillingForDarkVendorSlots(tenant.id),
    ]);
    return NextResponse.json({
      data: {
        ...overview,
        billing_paused: paused.map((campaign) => campaign.id),
        disclosure: SPOOFING_DISCLOSURE_EN,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
