import { NextResponse } from 'next/server';
import { jsonError, requireProximityStaff } from '@/lib/proximity/http';
import { proximityReports } from '@/lib/proximity/service';

export async function GET() {
  try {
    const { tenant } = await requireProximityStaff();
    return NextResponse.json({ data: await proximityReports(tenant.id) });
  } catch (error) {
    return jsonError(error);
  }
}
