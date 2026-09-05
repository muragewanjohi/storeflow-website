/**
 * GET /api/admin/payments/mpesa-env
 * 
 * Returns Mpesa environment configuration (for display purposes only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthOrRedirect('/admin/login');
    await requireRoleOrRedirect(user, 'landlord', '/admin/login');

    const environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    const baseUrl = environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    return NextResponse.json({
      environment,
      baseUrl,
      isProduction: environment === 'production',
      shortCode: process.env.MPESA_SHORTCODE ? '***' + process.env.MPESA_SHORTCODE.slice(-3) : 'Not set',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get environment info' },
      { status: 500 }
    );
  }
}
