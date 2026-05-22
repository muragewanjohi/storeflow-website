import { NextRequest, NextResponse } from 'next/server';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { loadRewardChecklistForTenant } from '@/lib/onboarding/onboarding-reward';

/**
 * GET /api/v1/mobile/dashboard/reward-checklist
 * Reward checklist — complete within 30 days of signup for +30 bonus days on expire_date.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only tenant users can access reward checklist'),
        { status: 403 },
      );
    }

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const data = await loadRewardChecklistForTenant(user.tenant_id);
    if (!data) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Tenant not found'), { status: 404 });
    }

    return NextResponse.json(mobileSuccess(data), { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized mobile request')) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Missing or invalid bearer token'),
        { status: 401 },
      );
    }
    console.error('[Mobile Reward Checklist GET]', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to load reward checklist'),
      { status: 500 },
    );
  }
}
