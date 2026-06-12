import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantAdmin } from '@/lib/auth/mobile-dashboard-tenant';
import {
  PesapalSubscriptionError,
  initiatePesapalSubscriptionPayment,
} from '@/lib/subscriptions/pesapal-subscription';

const initiateSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
  billingInterval: z.enum(['monthly', 'yearly']),
  enableRecurring: z.boolean().optional().default(false),
  embed: z.boolean().optional().default(false),
});

/**
 * POST /api/v1/mobile/dashboard/subscription/pesapal/initiate
 * Returns redirect URL for in-app WebView / external browser checkout.
 */
export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const body = initiateSchema.parse(await request.json());
    const result = await initiatePesapalSubscriptionPayment({
      tenantId: gate.ctx.tenantId,
      userId: gate.ctx.user.id,
      userEmail: gate.ctx.user.email,
      planId: body.planId,
      billingInterval: body.billingInterval,
      enableRecurring: body.enableRecurring,
      embed: body.embed,
    });

    return NextResponse.json(mobileSuccess(result), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid PesaPal subscription payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    if (error instanceof PesapalSubscriptionError) {
      return NextResponse.json(mobileError('BAD_REQUEST', error.message), {
        status: error.status,
      });
    }

    console.error('[Mobile Subscription PesaPal Initiate]', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to initiate PesaPal subscription payment'),
      { status: 500 },
    );
  }
}
