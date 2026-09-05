import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import {
  TumiziSubscriptionError,
  queryTumiziSubscriptionPaymentStatus,
} from '@/lib/subscriptions/tumizi-subscription';

const statusQuerySchema = z.object({
  externalReference: z.string().min(1, 'externalReference is required'),
});

/**
 * GET /api/v1/mobile/dashboard/subscription/tumizi/status?externalReference=
 */
export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(request.url);
    const { externalReference } = statusQuerySchema.parse({
      externalReference:
        searchParams.get('externalReference') ??
        searchParams.get('external_reference') ??
        searchParams.get('checkoutRequestId') ??
        searchParams.get('checkout_request_id') ??
        undefined,
    });

    const result = await queryTumiziSubscriptionPaymentStatus({
      tenantId: gate.ctx.tenantId,
      externalReference,
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

    if (error instanceof TumiziSubscriptionError) {
      return NextResponse.json(mobileError('NOT_FOUND', error.message), {
        status: error.status,
      });
    }

    console.error('[Mobile Subscription Tumizi Status]', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to query subscription payment status'),
      { status: 500 },
    );
  }
}
