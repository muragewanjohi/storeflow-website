import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireScanSdk } from '@/lib/proximity/http';
import { eventInputSchema } from '@/lib/proximity/validation';
import { findBeacon, recordEvent } from '@/lib/proximity/service';

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireScanSdk(request);
    const body = eventInputSchema.parse(await request.json());
    if (!body.consent && body.event_type !== 'nothing') {
      return NextResponse.json({ error: 'Consent required for proximity events' }, { status: 403 });
    }
    const beacon = await findBeacon({
      uuid: body.uuid,
      major: body.major,
      minor: body.minor,
      locationId: body.location_id,
      zoneId: body.zone_id,
    });
    const event = await recordEvent({
      tenantId,
      campaignId: body.campaign_id,
      locationId: body.location_id || beacon?.location_id,
      zoneId: body.zone_id || beacon?.zone_id,
      beaconId: beacon?.id,
      opaqueCustomerId: body.opaque_customer_id,
      visitId: body.visit_id,
      eventType: body.event_type,
      source: body.source || 'ble',
      consent: body.consent,
      impressionOnScreen: body.impression_on_screen,
    });
    return NextResponse.json({ data: { id: event.id, event_type: event.event_type } }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
