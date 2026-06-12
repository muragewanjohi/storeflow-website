import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantAdmin } from '@/lib/auth/mobile-dashboard-tenant';
import {
  ActivatePlanError,
  activateTenantSubscriptionPlan,
} from '@/lib/subscriptions/activate-plan';

const activateSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
});

/**
 * POST /api/v1/mobile/dashboard/subscription/activate
 * Activate, upgrade immediately, or schedule downgrade (no payment — use M-Pesa/PesaPal for paid checkout).
 */
export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const { planId } = activateSchema.parse(await request.json());
    const result = await activateTenantSubscriptionPlan({
      tenantId: gate.ctx.tenantId,
      planId,
      requestHeaders: request.headers,
    });

    return NextResponse.json(
      mobileSuccess({
        message: result.message,
        changeType: result.changeType,
        tenant: {
          id: result.tenant.id,
          planId: result.tenant.planId,
          scheduledPlanId: result.tenant.scheduledPlanId,
          expireDate: result.tenant.expireDate?.toISOString() ?? null,
          status: result.tenant.status,
        },
        plan: result.plan,
        proratedAmount: result.proratedAmount,
        effectiveDate: result.effectiveDate?.toISOString() ?? null,
        trialUsed: result.trialUsed,
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid activation payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    if (error instanceof ActivatePlanError) {
      return NextResponse.json(mobileError('BAD_REQUEST', error.message), {
        status: error.status,
      });
    }

    console.error('[Mobile Subscription Activate]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to activate subscription'), {
      status: 500,
    });
  }
}
