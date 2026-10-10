import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireScanSdk } from '@/lib/proximity/http';
import { DUKANEST_PROXIMITY_UUID } from '@/lib/proximity/constants';
import { resolveConfiguredBeaconAd } from '@/lib/proximity/service';

/**
 * GET /api/v1/proximity/ads/beacon?major=&minor=
 * The beacon's uuid, major, and minor identify the shelf. The phone can be on any network.
 */
export async function GET(request: NextRequest) {
  try {
    const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const tenantId = bearer ? (await requireScanSdk(request)).tenantId : undefined;

    const major = Number(request.nextUrl.searchParams.get('major'));
    const minor = Number(request.nextUrl.searchParams.get('minor'));
    if (!Number.isInteger(major) || !Number.isInteger(minor) || major < 0 || minor < 0) {
      return NextResponse.json({ error: 'Beacon major and minor are required' }, { status: 400 });
    }
    const uuid = request.nextUrl.searchParams.get('uuid') || DUKANEST_PROXIMITY_UUID;
    const result = await resolveConfiguredBeaconAd(major, minor, uuid, tenantId);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
