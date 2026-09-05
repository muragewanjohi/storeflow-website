/**
 * GET /api/dashboard/pos/bootstrap
 *
 * Web dashboard POS — refresh the catalogue + settings snapshot. The initial
 * load is done server-side by the page; this backs the "Refresh" action.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePosDashboardStaff } from '@/lib/pos/dashboard-auth';
import { loadPosBootstrap } from '@/lib/pos/load-bootstrap';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const gate = await requirePosDashboardStaff();
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(request.url);
    const payload = await loadPosBootstrap(gate.tenant, {
      since: searchParams.get('since'),
    });
    return NextResponse.json({ success: true, ...payload });
  } catch (error) {
    console.error('[Dashboard POS bootstrap]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load POS data' },
      { status: 500 },
    );
  }
}
