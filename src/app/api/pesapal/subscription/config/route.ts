/**
 * GET /api/pesapal/subscription/config
 *
 * Returns public PesaPal subscription config for the UI (yearly discount %, no secrets).
 */

import { NextResponse } from 'next/server';
import { pesapalConfig } from '@/lib/pesapal/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    yearlyDiscountPercent: pesapalConfig.yearlyDiscountPercent,
  });
}
