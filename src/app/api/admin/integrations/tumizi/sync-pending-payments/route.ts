/**
 * Cron: sync pending Tumizi order payments from the Partner API.
 *
 * GET /api/admin/integrations/tumizi/sync-pending-payments
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncPendingTumiziOrderPayments } from '@/lib/tumizi/sync-order-payment';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { verifyCronJobAuth } = await import('@/lib/cron-jobs/auth');
    const authResult = verifyCronJobAuth(request);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: `Unauthorized - ${authResult.reason || 'Invalid token'}` },
        { status: 401 },
      );
    }

    const result = await syncPendingTumiziOrderPayments({ maxAgeHours: 48, limit: 100 });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Tumizi cron sync-pending-payments]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 },
    );
  }
}
