import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireScanSdk } from '@/lib/proximity/http';
import { currentAdQuerySchema } from '@/lib/proximity/validation';
import { resolveCurrentAd } from '@/lib/proximity/service';
import { PRIVACY_COPY_EN, SPOOFING_DISCLOSURE_EN } from '@/lib/proximity/constants';

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireScanSdk(request);
    const parsed = currentAdQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    const result = await resolveCurrentAd({
      tenantId,
      uuid: parsed.uuid,
      major: parsed.major,
      minor: parsed.minor,
      locationId: parsed.location_id,
      zoneId: parsed.zone_id,
      campaignId: parsed.campaign_id,
      opaqueCustomerId: parsed.opaque_customer_id,
      visitId: parsed.visit_id,
      consent: parsed.consent !== 'false',
      source: parsed.source || 'ble',
      dwellElapsedMs: parsed.dwell_elapsed_ms ?? 0,
    });
    return NextResponse.json({
      ...result,
      privacy_copy: PRIVACY_COPY_EN,
      spoofing_disclosure: SPOOFING_DISCLOSURE_EN,
      impression_rule: 'Count delivered only after the in-app card is rendered on screen.',
    });
  } catch (error) {
    return jsonError(error);
  }
}
