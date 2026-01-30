/**
 * GET /api/admin/payments/pesapal-env
 *
 * Returns PesaPal environment configuration (for display on test page).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthOrRedirect('/admin/login');
    await requireRoleOrRedirect(user, 'landlord', '/admin/login');

    const environment =
      process.env.PESAPAL_USE_SANDBOX === 'true' ||
      process.env.PESAPAL_ENVIRONMENT === 'sandbox'
        ? 'sandbox'
        : 'live';

    return NextResponse.json({
      environment,
      isSandbox: environment === 'sandbox',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get PesaPal environment info' },
      { status: 500 }
    );
  }
}
