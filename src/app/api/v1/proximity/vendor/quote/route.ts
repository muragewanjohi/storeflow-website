import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireAdvertiser } from '@/lib/proximity/http';
import { presentQuote, quoteTenantPlacements } from '@/lib/proximity/rate-card';
import { proximityQuoteSchema } from '@/lib/proximity/validation';

export async function POST(request: NextRequest) {
  try {
    const advertiser = await requireAdvertiser(request);
    const body = proximityQuoteSchema.parse(await request.json());
    const startsAt = new Date(body.starts_at);
    const endsAt = new Date(body.ends_at);
    if (!(startsAt < endsAt) || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return NextResponse.json({ error: 'End date must be after the start date.' }, { status: 400 });
    }
    const quote = await quoteTenantPlacements(advertiser.tenant_id, startsAt, endsAt, body.placements);
    const data = presentQuote(quote);
    if (!data.priced) {
      data.message = 'This store has not published rates for every product section you selected.';
    }
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
