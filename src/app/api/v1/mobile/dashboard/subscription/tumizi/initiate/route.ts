import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantAdmin } from '@/lib/auth/mobile-dashboard-tenant';
import { TumiziApiError } from '@/lib/tumizi/client';
import {
  TumiziSubscriptionError,
  initiateTumiziSubscriptionPayment,
} from '@/lib/subscriptions/tumizi-subscription';

import { normalizeKenyaMsisdnForTumizi } from '@/lib/tumizi/phone';

const initiateSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
  phoneNumber: z
    .string()
    .min(9, 'Phone number is required')
    .refine((value) => normalizeKenyaMsisdnForTumizi(value) != null, {
      message: 'Invalid phone number format. Use 254XXXXXXXXX or 0XXXXXXXXX',
    }),
});

/**
 * POST /api/v1/mobile/dashboard/subscription/tumizi/initiate
 */
export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const body = initiateSchema.parse(await request.json());
    const result = await initiateTumiziSubscriptionPayment({
      tenantId: gate.ctx.tenantId,
      userId: gate.ctx.user.id,
      planId: body.planId,
      phoneNumber: body.phoneNumber,
      payerName:
        gate.ctx.user.metadata?.name ||
        gate.ctx.user.metadata?.full_name ||
        gate.ctx.tenant.name,
      payerEmail: gate.ctx.user.email || undefined,
    });

    return NextResponse.json(mobileSuccess(result), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid Tumizi subscription payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    if (error instanceof TumiziSubscriptionError) {
      return NextResponse.json(mobileError('BAD_REQUEST', error.message), {
        status: error.status,
      });
    }

    if (error instanceof TumiziApiError) {
      console.error('[Mobile Subscription Tumizi Initiate] Tumizi API error:', error);
      return NextResponse.json(mobileError('BAD_REQUEST', error.message), {
        status: error.status >= 400 && error.status < 500 ? error.status : 502,
      });
    }

    if (
      error instanceof Error &&
      (error.message.includes('TUMIZI') ||
        error.message.includes('Tumizi') ||
        error.message.includes('partner wallet'))
    ) {
      return NextResponse.json(
        mobileError(
          'INTERNAL_ERROR',
          'Payment service is not properly configured. Please contact support.',
        ),
        { status: 500 },
      );
    }

    console.error('[Mobile Subscription Tumizi Initiate]', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to initiate subscription payment'),
      { status: 500 },
    );
  }
}
