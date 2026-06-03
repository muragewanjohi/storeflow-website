import { NextResponse } from 'next/server';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { getReferralsSummaryForTenant } from '@/lib/referrals/service';

/**
 * GET /api/dashboard/referrals
 * Referral summary for web dashboard.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin', 'tenant_staff']);
    const tenant = await requireTenant();

    if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const data = await getReferralsSummaryForTenant(tenant.id);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('[Dashboard Referrals GET]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch referrals' }, { status: 500 });
  }
}
