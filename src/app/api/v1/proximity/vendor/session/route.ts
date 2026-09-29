import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireAdvertiser } from '@/lib/proximity/http';

export async function GET(request: NextRequest) {
  try {
    const advertiser = await requireAdvertiser(request);
    return NextResponse.json({
      data: { id: advertiser.id, name: advertiser.name, email: advertiser.email },
    });
  } catch (error) {
    return jsonError(error);
  }
}
