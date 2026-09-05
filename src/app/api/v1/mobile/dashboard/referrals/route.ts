import { NextRequest, NextResponse } from 'next/server';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { getReferralsSummaryForTenant } from '@/lib/referrals/service';

/**
 * GET /api/v1/mobile/dashboard/referrals
 * Referral summary for mobile dashboard.
 */
export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const data = await getReferralsSummaryForTenant(gate.ctx.tenantId);
    return NextResponse.json(mobileSuccess(data), { status: 200 });
  } catch (error) {
    console.error('[Mobile Referrals GET]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch referrals'), {
      status: 500,
    });
  }
}
