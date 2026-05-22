import { prisma } from '@/lib/prisma/client';
import { getLocalizedPrice } from '@/lib/pricing/location';

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

export async function loadActiveSubscriptionPlans(options: {
  isKenya: boolean;
  isDemoStore?: boolean;
}): Promise<SubscriptionPlanDto[]> {
  const { isKenya, isDemoStore = false } = options;

  const rows = await prisma.price_plans.findMany({
    where: {
      status: 'active',
      OR: [{ name: 'Basic' }, { name: 'Pro' }, { name: 'Standard' }, { name: 'Premium' }],
    },
    orderBy: { price: 'asc' },
    select: {
      id: true,
      name: true,
      price: true,
      duration_months: true,
      trial_days: true,
      features: true,
    },
  });

  const plans = rows.map((plan) => {
    const usdPrice = Number(plan.price);
    const localizedPrice = isKenya
      ? getLocalizedPrice(plan.name, true, usdPrice, isDemoStore)
      : usdPrice;

    return {
      id: plan.id,
      name: plan.name,
      price: localizedPrice || usdPrice,
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
    isKenya: tenant.country === 'KE',
    isDemoStore: data.is_demo === true || data.isDemo === true,
  };
}
