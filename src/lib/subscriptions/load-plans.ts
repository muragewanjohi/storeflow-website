import { prisma } from '@/lib/prisma/client';
import { isKenyaCountry, resolvePlanMonthlyPrice } from '@/lib/pricing/location';

export type SubscriptionPlanDto = {
  id: string;
  name: string;
  price: number;
  durationMonths: number;
  trialDays: number | null;
  features: unknown;
  currency: string;
  currencySymbol: string;
};

export async function getDefaultRegistrationPlan() {
  return prisma.price_plans.findFirst({
    where: {
      status: 'active',
      name: { equals: 'Basic', mode: 'insensitive' },
    },
    orderBy: { price: 'asc' },
  });
}

export async function loadActiveSubscriptionPlans(options: {
  isKenya: boolean;
}): Promise<SubscriptionPlanDto[]> {
  const { isKenya } = options;

  const rows = await prisma.price_plans.findMany({
    where: { status: 'active' },
    orderBy: { price: 'asc' },
    select: {
      id: true,
      name: true,
      price: true,
      price_kes: true,
      duration_months: true,
      trial_days: true,
      features: true,
    },
  });

  const plans = rows.map((plan) => {
    const displayPrice = resolvePlanMonthlyPrice(
      { price: plan.price, price_kes: plan.price_kes },
      isKenya,
    );

    return {
      id: plan.id,
      name: plan.name,
      price: displayPrice,
      priceUsd: Number(plan.price),
      priceKes: plan.price_kes != null ? Number(plan.price_kes) : null,
      durationMonths: plan.duration_months,
      trialDays: plan.trial_days,
      features: plan.features,
      currency: isKenya ? 'KES' : 'USD',
      currencySymbol: isKenya ? 'Ksh' : '$',
    };
  });

  plans.sort((a, b) => a.price - b.price);
  return plans;
}

export function tenantPricingContext(tenant: {
  country?: string | null;
  data?: unknown;
}): { isKenya: boolean; isDemoStore: boolean } {
  const data =
    tenant.data && typeof tenant.data === 'object' && !Array.isArray(tenant.data)
      ? (tenant.data as Record<string, unknown>)
      : {};
  return {
    isKenya: isKenyaCountry(tenant.country),
    isDemoStore: data.is_demo === true || data.isDemo === true,
  };
}
