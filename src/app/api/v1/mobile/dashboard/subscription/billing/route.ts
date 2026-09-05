import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { resolvePlanMonthlyPrice } from '@/lib/pricing/location';
import { tenantPricingContext } from '@/lib/subscriptions/load-plans';
import { getDaysUntil, getTrialDaysRemaining } from '@/lib/subscriptions/trial';

/**
 * GET /api/v1/mobile/dashboard/subscription/billing
 * Subscription plan snapshot + billing history (parity with web dashboard).
 */
export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const tenant = await prisma.tenants.findFirst({
      where: { id: gate.ctx.tenantId, deleted_at: null },
      include: {
        price_plans: {
          select: {
            id: true,
            name: true,
            price: true,
            price_kes: true,
            duration_months: true,
            trial_days: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Tenant not found'), { status: 404 });
    }

    const paymentLogs = await prisma.payment_logs.findMany({
      where: { tenant_id: tenant.id, status: 'completed' },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    const planIds = [
      ...new Set(
        paymentLogs
          .map((log) => (log.metadata as Record<string, unknown>)?.plan_id as string)
          .filter(Boolean),
      ),
    ];

    const plans =
      planIds.length > 0
        ? await prisma.price_plans.findMany({
            where: { id: { in: planIds } },
            select: { id: true, name: true },
          })
        : [];
    const planByName = Object.fromEntries(plans.map((p) => [p.id, p.name]));

    const billingHistory = paymentLogs.map((log) => {
      const meta = (log.metadata ?? {}) as Record<string, unknown>;
      const planId = meta.plan_id as string | undefined;
      const planName = planId ? (planByName[planId] ?? 'Subscription') : 'Subscription';
      return {
        id: log.id,
        type: 'subscription',
        description: `Subscription: ${planName}`,
        amount: Number(log.amount),
        currency: log.currency ?? 'USD',
        status: 'active',
        date: log.created_at?.toISOString() ?? null,
      };
    });

    const { isKenya } = tenantPricingContext(tenant);
    const currencySymbol = isKenya ? 'Ksh' : '$';
    const currency = isKenya ? 'KES' : 'USD';

    const trialDays = tenant.price_plans?.trial_days ?? null;
    const startDate = tenant.start_date ?? tenant.created_at;
    const expireDate = tenant.expire_date;
    const daysUntilRenewal = expireDate ? getDaysUntil(expireDate) : null;
    const isExpired = daysUntilRenewal != null && daysUntilRenewal <= 0;
    const isExpiringSoon =
      daysUntilRenewal != null && daysUntilRenewal > 0 && daysUntilRenewal <= 7;
    const displayPrice = tenant.price_plans
      ? resolvePlanMonthlyPrice(
          { price: tenant.price_plans.price, price_kes: tenant.price_plans.price_kes },
          isKenya,
        )
      : 0;

    return NextResponse.json(
      mobileSuccess({
        currentPlan: tenant.price_plans
          ? {
              id: tenant.price_plans.id,
              name: tenant.price_plans.name,
              price: displayPrice,
              priceUsd: Number(tenant.price_plans.price),
              priceKes:
                tenant.price_plans.price_kes != null
                  ? Number(tenant.price_plans.price_kes)
                  : null,
              durationMonths: tenant.price_plans.duration_months,
              trialDays,
              currency,
              currencySymbol,
            }
          : null,
        subscriptionStatus: tenant.status ?? 'active',
        startDate: startDate?.toISOString() ?? null,
        expireDate: expireDate?.toISOString() ?? null,
        renewalDate: expireDate?.toISOString() ?? null,
        trialDaysRemaining: getTrialDaysRemaining({
          trialDays,
          startDate,
          expireDate,
        }),
        daysUntilExpire: daysUntilRenewal,
        daysUntilRenewal,
        isExpired,
        isExpiringSoon,
        needsRenewalPayment:
          (isExpired || isExpiringSoon) && Boolean(tenant.price_plans && displayPrice > 0),
        pricing: { isKenya, currency, currencySymbol },
        billingHistory,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error('[Mobile Subscription Billing GET]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch billing history'), {
      status: 500,
    });
  }
}
