import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import {
  MpesaSubscriptionError,
  queryMpesaSubscriptionPaymentStatus,
} from '@/lib/subscriptions/mpesa-subscription';

const statusQuerySchema = z.object({
  checkoutRequestId: z.string().min(1, 'checkoutRequestId is required'),
});

/**
 * GET /api/v1/mobile/dashboard/subscription/mpesa/status?checkoutRequestId=
 * Poll subscription STK payment (activates tenant via server callback when completed).
 */
export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(request.url);
    const { checkoutRequestId } = statusQuerySchema.parse({
      checkoutRequestId:
        searchParams.get('checkoutRequestId') ??
        searchParams.get('checkout_request_id') ??
        undefined,
    });

    const result = await queryMpesaSubscriptionPaymentStatus({
      tenantId: gate.ctx.tenantId,
      checkoutRequestId,
    });

    return NextResponse.json(mobileSuccess(result), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid status query parameters',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    if (error instanceof MpesaSubscriptionError) {
      return NextResponse.json(mobileError('NOT_FOUND', error.message), {
        status: error.status,
      });
    }

    console.error('[Mobile Subscription M-Pesa Status]', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to query subscription payment status'),
      { status: 500 },
    );
  }
}
