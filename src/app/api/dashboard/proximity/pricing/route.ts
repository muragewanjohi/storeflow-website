import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { loadRateCard, saveRateCard } from '@/lib/proximity/rate-card';
import { rateCardInputSchema } from '@/lib/proximity/validation';

export async function GET() {
  try {
    const { tenant } = await requireProximityStaff();
    const data = await loadRateCard(tenant.id);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenant } = await requireProximityStaff();
    const body = rateCardInputSchema.parse(await request.json());
    const data = await saveRateCard(tenant.id, body);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
