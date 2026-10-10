import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireAdvertiser } from '@/lib/proximity/http';
import { listPricesForInventory } from '@/lib/proximity/rate-card';

export async function GET(request: NextRequest) {
  try {
    const advertiser = await requireAdvertiser(request);
    const locations = await listPricesForInventory(advertiser.tenant_id);
    return NextResponse.json({ data: locations });
  } catch (error) {
    return jsonError(error);
  }
}
