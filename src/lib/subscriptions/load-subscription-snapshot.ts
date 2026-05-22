import { prisma } from '@/lib/prisma/client';
import { pesapalConfig } from '@/lib/pesapal/config';
import { getLocalizedPrice } from '@/lib/pricing/location';
import { loadActiveSubscriptionPlans, tenantPricingContext } from '@/lib/subscriptions/load-plans';
import { planLimitsFromFeatures } from '@/lib/subscriptions/plan-limits';
import { getDaysUntil, getTrialDaysRemaining } from '@/lib/subscriptions/trial';

function mapPlanRow(plan: {
  id: string;
  name: string;
  price: unknown;
  duration_months: number;
  trial_days: number | null;
  features: unknown;
}) {
  return {
    id: plan.id,
    name: plan.name,
    price: Number(plan.price),
    durationMonths: plan.duration_months,
    trialDays: plan.trial_days,
    features: plan.features,
  };
}

export async function loadMobileSubscriptionSnapshot(tenantId: string) {
  const tenant = await prisma.tenants.findFirst({
    where: { id: tenantId, deleted_at: null },
    include: {
      price_plans: true,
      scheduled_plan: true,
    },
  });

  if (!tenant) return null;

  const { isKenya, isDemoStore } = tenantPricingContext(tenant);

  const [availablePlans, usage] = await Promise.all([
    loadActiveSubscriptionPlans({ isKenya, isDemoStore }),
    Promise.all([
      prisma.products.count({ where: { tenant_id: tenantId } }),
      prisma.orders.count({ where: { tenant_id: tenantId } }),
      prisma.pages.count({ where: { tenant_id: tenantId } }),
      prisma.blogs.count({ where: { tenant_id: tenantId } }),
      prisma.customers.count({ where: { tenant_id: tenantId } }),
    ]),
  ]);

  const currentPlan = tenant.price_plans
    ? {
        ...mapPlanRow(tenant.price_plans),
        price: isKenya
          ? getLocalizedPrice(
              tenant.price_plans.name,
              true,
              Number(tenant.price_plans.price),
              isDemoStore,
            )
          : Number(tenant.price_plans.price),
        currency: isKenya ? 'KES' : 'USD',
        currencySymbol: isKenya ? 'Ksh' : '$',
      }
    : null;

  const scheduledPlan = tenant.scheduled_plan
    ? {
        ...mapPlanRow(tenant.scheduled_plan),
        price: isKenya
          ? getLocalizedPrice(
              tenant.scheduled_plan.name,
              true,
              Number(tenant.scheduled_plan.price),
              isDemoStore,
            )
          : Number(tenant.scheduled_plan.price),
      }
    : null;

  const trialDays = currentPlan?.trialDays ?? null;
  const startDate = tenant.start_date ?? tenant.created_at;
  const expireDate = tenant.expire_date;

  return {
    currentPlan,
    scheduledPlan,
    scheduledPlanChangeDate: tenant.scheduled_plan_change_date?.toISOString() ?? null,
    availablePlans,
    usage: {
      products: usage[0],
      orders: usage[1],
      pages: usage[2],
      blogs: usage[3],
      customers: usage[4],
    },
    planLimits: currentPlan ? planLimitsFromFeatures(currentPlan.features) : planLimitsFromFeatures(null),
    subscriptionStatus: tenant.status ?? 'active',
    startDate: startDate?.toISOString() ?? null,
    expireDate: expireDate?.toISOString() ?? null,
    renewalDate: expireDate?.toISOString() ?? null,
    trialDaysRemaining: getTrialDaysRemaining({ trialDays, startDate, expireDate }),
    daysUntilExpire: expireDate ? getDaysUntil(expireDate) : null,
    upgradeProratedAmount:
      tenant.upgrade_prorated_amount != null ? Number(tenant.upgrade_prorated_amount) : null,
    pesapal: {
      yearlyDiscountPercent: pesapalConfig.yearlyDiscountPercent,
    },
    pricing: {
      isKenya,
      currency: isKenya ? 'KES' : 'USD',
      currencySymbol: isKenya ? 'Ksh' : '$',
    },
  };
}
