import { NextRequest, NextResponse } from 'next/server';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { loadMobileSubscriptionSnapshot } from '@/lib/subscriptions/load-subscription-snapshot';

/**
 * GET /api/v1/mobile/dashboard/subscription
 * Full subscription screen snapshot (web parity): plans catalog, usage progress,
 * access restrictions, renewal/pay CTAs, scheduled downgrades, payment capabilities.
 */
export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const snapshot = await loadMobileSubscriptionSnapshot(gate.ctx.tenantId);
    if (!snapshot) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Tenant not found'), { status: 404 });
    }

    return NextResponse.json(mobileSuccess(snapshot), { status: 200 });
  } catch (error) {
    console.error('[Mobile Subscription GET]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to load subscription'), {
      status: 500,
    });
  }
}
