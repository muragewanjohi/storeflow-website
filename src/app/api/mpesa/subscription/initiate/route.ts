/**
 * POST /api/mpesa/subscription/initiate
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import {
  MpesaSubscriptionError,
  initiateMpesaSubscriptionPayment,
} from '@/lib/subscriptions/mpesa-subscription';

const initiatePaymentSchema = z.object({
  plan_id: z.string().uuid('Invalid plan ID'),
  phone_number: z.string().regex(/^(?:254|0)[0-9]{9}$/, {
    message: 'Invalid phone number format. Use 254XXXXXXXXX or 0XXXXXXXXX',
  }),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin']);

    const tenant = await requireTenant();

    if (user.tenant_id !== tenant.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { plan_id, phone_number } = initiatePaymentSchema.parse(await request.json());

    const result = await initiateMpesaSubscriptionPayment({
      tenantId: tenant.id,
      userId: user.id,
      planId: plan_id,
      phoneNumber: phone_number,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      checkout_request_id: result.checkoutRequestId,
      payment_log_id: result.paymentLogId,
      amount: result.amount,
      currency: result.currency,
    });
  } catch (error) {
    console.error('[Mpesa Subscription Initiate] Error:', error);

    if (error instanceof MpesaSubscriptionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', errors: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes('M-Pesa configuration')) {
      return NextResponse.json(
        { error: 'Payment service is not properly configured. Please contact support.' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : 'Failed to initiate payment. Please try again or contact support.',
      },
      { status: 500 },
    );
  }
}
