/**
 * GET /api/v1/mobile/pos/bootstrap
 *
 * One call the Flutter POS makes (when online) to fill / refresh its offline
 * cache: the sellable catalog + the store settings needed to compute totals
 * and render a receipt. The payload build is shared with the web route via
 * @/lib/pos/load-bootstrap.
 *
 * Design: storeflow/docs/POS_OFFLINE_DESIGN.md §6.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { loadPosBootstrap } from '@/lib/pos/load-bootstrap';

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(request.url);
    const payload = await loadPosBootstrap(gate.ctx.tenant, {
      since: searchParams.get('since'),
    });
    return NextResponse.json(mobileSuccess(payload), { status: 200 });
  } catch (error) {
    console.error('[Mobile POS bootstrap]', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to load POS data'),
      { status: 500 },
    );
  }
}
