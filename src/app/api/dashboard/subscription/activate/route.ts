/**
 * Tenant Subscription Activation API Route
 *
 * POST /api/dashboard/subscription/activate
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import {
  ActivatePlanError,
  activateTenantSubscriptionPlan,
} from '@/lib/subscriptions/activate-plan';

const activatePlanSchema = z.object({
  plan_id: z.string().uuid('Invalid plan ID'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin']);

    const tenant = await requireTenant();

    if (user.tenant_id !== tenant.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { plan_id } = activatePlanSchema.parse(await request.json());

    const result = await activateTenantSubscriptionPlan({
      tenantId: tenant.id,
      planId: plan_id,
      requestHeaders: request.headers,
    });

    return NextResponse.json({
      message: result.message,
      tenant: {
        id: result.tenant.id,
        plan_id: result.tenant.planId,
        scheduled_plan_id: result.tenant.scheduledPlanId,
        expire_date: result.tenant.expireDate,
        status: result.tenant.status,
      },
      plan: result.plan
        ? {
            id: result.plan.id,
            name: result.plan.name,
            price: result.plan.price,
            duration_months: result.plan.durationMonths,
          }
        : null,
      changeType: result.changeType,
      proratedAmount: result.proratedAmount,
      effectiveDate: result.effectiveDate,
      trialUsed: result.trialUsed,
    });
  } catch (error) {
    console.error('Error activating subscription:', error);

    if (error instanceof ActivatePlanError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', errors: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : 'Failed to activate subscription',
      },
      { status: 500 },
    );
  }
}
