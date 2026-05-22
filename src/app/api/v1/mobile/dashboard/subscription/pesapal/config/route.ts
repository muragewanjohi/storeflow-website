import { NextResponse } from 'next/server';
import { mobileSuccess } from '@/lib/api/mobile-response';
import { pesapalConfig } from '@/lib/pesapal/config';

/**
 * GET /api/v1/mobile/dashboard/subscription/pesapal/config
 */
export async function GET() {
  return NextResponse.json(
    mobileSuccess({
      yearlyDiscountPercent: pesapalConfig.yearlyDiscountPercent,
    }),
    { status: 200 },
  );
}
