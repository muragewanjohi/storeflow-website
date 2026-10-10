import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/tenant-context';
import { jsonError, requireScanSdk } from '@/lib/proximity/http';
import { listShowcaseCards } from '@/lib/proximity/service';

function hostnameWithoutPort(host: string): string {
  return host.split(':')[0];
}

function isLocalDemoHost(host: string): boolean {
  const name = hostnameWithoutPort(host);
  return (
    name === 'localhost' ||
    name === '127.0.0.1' ||
    name.endsWith('.localhost') ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(name)
  );
}

/**
 * GET /api/v1/proximity/ads/showcase
 * Cards for a supermarket demo. No beacon and no typed scan key.
 * A store query is accepted only when the request host is local.
 */
export async function GET(request: NextRequest) {
  try {
    const host = request.headers.get('host') || '';
    const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    let tenantId: string;

    if (bearer) {
      tenantId = (await requireScanSdk(request)).tenantId;
    } else {
      const store = request.nextUrl.searchParams.get('store')?.trim().toLowerCase() || '';
      const lookupHost =
        store && isLocalDemoHost(host) && /^[a-z0-9-]{1,63}$/.test(store) ? `${store}.localhost` : host;
      const tenant = await getTenantFromRequest(lookupHost);
      if (!tenant) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 });
      }
      tenantId = tenant.id;
    }

    const data = await listShowcaseCards(tenantId);
    return NextResponse.json({
      data,
      note: 'Demo cards. Swipe to the next shelf. These views are not counted.',
    });
  } catch (error) {
    return jsonError(error);
  }
}
