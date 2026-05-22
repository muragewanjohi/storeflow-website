/**
 * GET /api/mpesa/subscription/status?checkout_request_id=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import {
  MpesaSubscriptionError,
  queryMpesaSubscriptionPaymentStatus,
} from '@/lib/subscriptions/mpesa-subscription';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    if (user.tenant_id !== tenant.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const checkoutRequestId = request.nextUrl.searchParams.get('checkout_request_id');

    if (!checkoutRequestId) {
      return NextResponse.json({ error: 'checkout_request_id is required' }, { status: 400 });
    }

    const result = await queryMpesaSubscriptionPaymentStatus({
      tenantId: tenant.id,
      checkoutRequestId,
    });

    return NextResponse.json({
      status: result.status,
      ...(result.subscriptionType && { subscription_type: result.subscriptionType }),
      ...(result.mpesaResult && { mpesa_result: result.mpesaResult }),
      ...(result.queryError && { error: result.queryError }),
      payment_log: {
        id: result.paymentLog.id,
        amount: result.paymentLog.amount,
        transaction_id: result.paymentLog.transactionId,
        status: result.paymentLog.status,
      },
    });
  } catch (error) {
    console.error('[Mpesa Status Query] Error:', error);

    if (error instanceof MpesaSubscriptionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : 'Failed to query payment status',
      },
      { status: 500 },
    );
  }
}
