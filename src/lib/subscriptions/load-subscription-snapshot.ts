import { prisma } from '@/lib/prisma/client';
import { pesapalConfig } from '@/lib/pesapal/config';
import { resolvePlanMonthlyPrice } from '@/lib/pricing/location';
import { getTenantAccessRestriction } from '@/lib/tenant-context/access-control';
import type { Tenant } from '@/lib/tenant-context';
import { loadActiveSubscriptionPlans, tenantPricingContext } from '@/lib/subscriptions/load-plans';
import { planLimitsFromFeatures, type PlanLimits } from '@/lib/subscriptions/plan-limits';
import { getPlanChangeType } from '@/lib/subscriptions/proration';
import { getDaysUntil, getTrialDaysRemaining } from '@/lib/subscriptions/trial';

function mapPlanRow(plan: {
  id: string;
  name: string;
  price: unknown;
  price_kes?: unknown | null;
  duration_months: number;
  trial_days: number | null;
  features: unknown;
}) {
  return {
    id: plan.id,
    name: plan.name,
    price: Number(plan.price),
    priceKes: plan.price_kes != null ? Number(plan.price_kes) : null,
    durationMonths: plan.duration_months,
    trialDays: plan.trial_days,
    features: plan.features,
  };
}

type UsageCounts = {
  products: number;
  orders: number;
  pages: number;
  blogs: number;
  customers: number;
};

function buildUsageDetails(usage: UsageCounts, limits: PlanLimits) {
  const rows = [
    { key: 'products', label: 'Products', current: usage.products, limit: limits.maxProducts },
    { key: 'orders', label: 'Orders', current: usage.orders, limit: limits.maxOrders },
    { key: 'pages', label: 'Pages', current: usage.pages, limit: limits.maxPages },
    { key: 'blogs', label: 'Blogs', current: usage.blogs, limit: limits.maxBlogs },
    { key: 'customers', label: 'Customers', current: usage.customers, limit: limits.maxCustomers },
  ];

  return rows.map((row) => {
    const unlimited = row.limit === -1;
    const hasFiniteLimit = row.limit != null && row.limit > 0;
    const percentage = hasFiniteLimit
      ? Math.min((row.current / row.limit!) * 100, 100)
      : 0;

    return {
      ...row,
      unlimited,
      percentage: Math.round(percentage * 10) / 10,
      nearLimit: hasFiniteLimit && percentage >= 90,
      atLimit: hasFiniteLimit && row.current >= row.limit!,
    };
  });
}

function buildPlanFeatureHighlights(features: unknown) {
  const f =
    features && typeof features === 'object' && !Array.isArray(features)
      ? (features as Record<string, unknown>)
      : {};

  const maxProducts =
    (f.max_products as number | undefined) ??
    (f.product_permission_feature as number | undefined);
  const maxOrders = f.max_orders as number | undefined;
  const maxStorageMb =
    (f.max_storage_mb as number | undefined) ??
    (f.storage_permission_feature as number | undefined);
  const maxCustomers = f.max_customers as number | undefined;

  const highlights: string[] = [];

  if (maxProducts !== undefined) {
    highlights.push(
      maxProducts === -1 ? 'Unlimited products' : `${maxProducts.toLocaleString()} products`,
    );
  }
  if (maxOrders !== undefined) {
    highlights.push(
      maxOrders === -1 ? 'Unlimited orders' : `${maxOrders.toLocaleString()} orders`,
    );
  }
  if (maxStorageMb !== undefined) {
    highlights.push(
      maxStorageMb === -1
        ? 'Unlimited storage'
        : `${(maxStorageMb / 1024).toFixed(0)} GB storage`,
    );
  }
  if (maxCustomers !== undefined) {
    highlights.push(
      maxCustomers === -1
        ? 'Unlimited customers'
        : `${maxCustomers.toLocaleString()} customers`,
    );
  }

  return highlights;
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

  const { isKenya } = tenantPricingContext(tenant);

  const [availablePlansRaw, usage] = await Promise.all([
    loadActiveSubscriptionPlans({ isKenya }),
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
        price: resolvePlanMonthlyPrice(
          { price: tenant.price_plans.price, price_kes: tenant.price_plans.price_kes },
          isKenya,
        ),
        priceUsd: Number(tenant.price_plans.price),
        currency: isKenya ? 'KES' : 'USD',
        currencySymbol: isKenya ? 'Ksh' : '$',
        isCurrentPlan: true,
      }
    : null;

  const scheduledPlan = tenant.scheduled_plan
    ? {
        ...mapPlanRow(tenant.scheduled_plan),
        price: resolvePlanMonthlyPrice(
          { price: tenant.scheduled_plan.price, price_kes: tenant.scheduled_plan.price_kes },
          isKenya,
        ),
        priceUsd: Number(tenant.scheduled_plan.price),
        currency: isKenya ? 'KES' : 'USD',
        currencySymbol: isKenya ? 'Ksh' : '$',
      }
    : null;

  const currentPlanPrice = currentPlan?.price ?? 0;

  let availablePlans = availablePlansRaw.map((plan) => ({
    ...plan,
    isCurrentPlan: plan.id === tenant.plan_id,
    changeType: currentPlan
      ? getPlanChangeType(currentPlanPrice, plan.price)
      : ('activation' as const),
    isFree: plan.price <= 0,
    featureHighlights: buildPlanFeatureHighlights(plan.features),
  }));

  if (currentPlan && !availablePlans.some((plan) => plan.id === currentPlan.id)) {
    const inactiveCurrentPlan = availablePlansRaw.find((plan) => plan.id === currentPlan.id);
    availablePlans = [
      {
        ...(inactiveCurrentPlan ?? {
          id: currentPlan.id,
          name: currentPlan.name,
          price: currentPlan.price,
          priceUsd: currentPlan.priceUsd,
          priceKes: currentPlan.priceKes,
          durationMonths: currentPlan.durationMonths,
          trialDays: currentPlan.trialDays,
          features: currentPlan.features,
          currency: currentPlan.currency,
          currencySymbol: currentPlan.currencySymbol,
        }),
        isCurrentPlan: true,
        changeType: 'same' as const,
        isFree: currentPlan.price <= 0,
        featureHighlights: buildPlanFeatureHighlights(currentPlan.features),
      },
      ...availablePlans,
    ];
  }

  const trialDays = currentPlan?.trialDays ?? null;
  const startDate = tenant.start_date ?? tenant.created_at;
  const expireDate = tenant.expire_date;
  const daysUntilRenewal = expireDate ? getDaysUntil(expireDate) : null;
  const isExpired = daysUntilRenewal != null && daysUntilRenewal <= 0;
  const isExpiringSoon =
    daysUntilRenewal != null && daysUntilRenewal > 0 && daysUntilRenewal <= 7;
  const needsRenewalPayment =
    (isExpired || isExpiringSoon) && Boolean(currentPlan && currentPlan.price > 0);

  const planLimits = currentPlan
    ? planLimitsFromFeatures(currentPlan.features)
    : planLimitsFromFeatures(null);

  const usageCounts: UsageCounts = {
    products: usage[0],
    orders: usage[1],
    pages: usage[2],
    blogs: usage[3],
    customers: usage[4],
  };

  const accessRestriction = getTenantAccessRestriction({
    id: tenant.id,
    subdomain: tenant.subdomain,
    name: tenant.name,
    status: tenant.status ?? 'active',
    expire_date: tenant.expire_date,
    created_at: tenant.created_at,
    updated_at: tenant.updated_at,
  } as Tenant);

  const inTrial = isExpired
    ? false
    : Boolean(
        trialDays &&
          trialDays > 0 &&
          daysUntilRenewal != null &&
          daysUntilRenewal > 0 &&
          daysUntilRenewal <= trialDays,
      );

  return {
    currentPlan,
    scheduledPlan,
    scheduledPlanChangeDate: tenant.scheduled_plan_change_date?.toISOString() ?? null,
    scheduledDowngrade:
      scheduledPlan && tenant.scheduled_plan_change_date
        ? {
            fromPlanName: currentPlan?.name ?? null,
            toPlanName: scheduledPlan.name,
            effectiveDate: tenant.scheduled_plan_change_date.toISOString(),
          }
        : null,
    availablePlans,
    usage: usageCounts,
    usageDetails: buildUsageDetails(usageCounts, planLimits),
    planLimits,
    subscriptionStatus: tenant.status ?? 'active',
    startDate: startDate?.toISOString() ?? null,
    expireDate: expireDate?.toISOString() ?? null,
    renewalDate: expireDate?.toISOString() ?? null,
    trialDaysRemaining: getTrialDaysRemaining({ trialDays, startDate, expireDate }),
    daysUntilExpire: daysUntilRenewal,
    daysUntilRenewal,
    isExpired,
    isExpiringSoon,
    inTrial,
    needsRenewalPayment,
    upgradeProratedAmount:
      tenant.upgrade_prorated_amount != null ? Number(tenant.upgrade_prorated_amount) : null,
    accessRestriction: {
      level: accessRestriction.level,
      reason: accessRestriction.reason,
      canRenew: accessRestriction.canRenew,
      canViewData: accessRestriction.canViewData,
      canEditData: accessRestriction.canEditData,
      canProcessOrders: accessRestriction.canProcessOrders,
      canAcceptCustomerOrders: accessRestriction.canAcceptCustomerOrders,
      daysRemaining: accessRestriction.daysRemaining,
      gracePeriodEnd: accessRestriction.gracePeriodEnd?.toISOString() ?? null,
    },
    summary: currentPlan
      ? {
          planName: currentPlan.name,
          monthlyPrice: currentPlan.price,
          currency: currentPlan.currency,
          currencySymbol: currentPlan.currencySymbol,
          billingCycleLabel:
            currentPlan.durationMonths === 1
              ? 'month'
              : `${currentPlan.durationMonths} months`,
          renewalDate: expireDate?.toISOString() ?? null,
          status: tenant.status ?? 'active',
          statusLabel:
            accessRestriction.level === 'read-only'
              ? 'expired_grace_period'
              : tenant.status ?? 'active',
        }
      : null,
    pesapal: {
      yearlyDiscountPercent: pesapalConfig.yearlyDiscountPercent,
    },
    pricing: {
      isKenya,
      currency: isKenya ? 'KES' : 'USD',
      currencySymbol: isKenya ? 'Ksh' : '$',
    },
    capabilities: {
      canActivatePlans: accessRestriction.canEditData,
      canPayForSubscription: accessRestriction.canRenew,
      paymentMethods: isKenya ? ['mpesa', 'pesapal'] : ['pesapal'],
    },
  };
}
