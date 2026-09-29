import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jsonError, requireScanSdk } from '@/lib/proximity/http';
import { nearbyBranches } from '@/lib/proximity/service';

const bodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireScanSdk(request);
    const body = bodySchema.parse(await request.json());
    const result = await nearbyBranches(tenantId, body.latitude, body.longitude);
    return NextResponse.json({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}
