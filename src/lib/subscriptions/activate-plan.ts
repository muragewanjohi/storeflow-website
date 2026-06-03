import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@prisma/client';
import {
  sendPlanDowngradeScheduledEmail,
  sendPlanUpgradeConfirmationEmail,
  sendSubscriptionActivatedEmail,
} from '@/lib/subscriptions/emails';
import { detectUserLocation, resolvePlanMonthlyPrice } from '@/lib/pricing/location';
import {
  calculateDaysAsPayingCustomer,
  calculateUpgradeProration,
  getPlanChangeType,
  shouldOfferTrialOnUpgrade,
} from '@/lib/subscriptions/proration';

export class ActivatePlanError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ActivatePlanError';
  }
}

export type ActivatePlanResult = {
  message: string;
  changeType: string;
  tenant: {
    id: string;
    planId: string | null;
    scheduledPlanId: string | null;
    expireDate: Date | null;
    status: string | null;
  };
  plan: {
    id: string;
    name: string;
    price: number;
    durationMonths: number;
  } | null;
  proratedAmount: number;
  effectiveDate?: Date;
  trialUsed: boolean;
};

export async function activateTenantSubscriptionPlan(input: {
  tenantId: string;
  planId: string;
  requestHeaders: Headers;
}): Promise<ActivatePlanResult> {
  const tenant = await prisma.tenants.findUnique({
    where: { id: input.tenantId, deleted_at: null },
  });

  if (!tenant) {
    throw new ActivatePlanError('Tenant not found', 404);
  }

  const newPlan = await prisma.price_plans.findUnique({
    where: { id: input.planId },
  });

  if (!newPlan) {
    throw new ActivatePlanError('Price plan not found', 404);
  }

  if (newPlan.status !== 'active') {
    throw new ActivatePlanError('Price plan is not active', 400);
  }

  const currentPlan = tenant.plan_id
    ? await prisma.price_plans.findUnique({ where: { id: tenant.plan_id } })
    : null;

  const locationInfo = detectUserLocation(input.requestHeaders);
  const newPlanPrice = Number(newPlan.price);
  const currentPlanPrice = currentPlan ? Number(currentPlan.price) : 0;
  const changeType = getPlanChangeType(currentPlanPrice, newPlanPrice);

  if (changeType === 'same' && currentPlan?.id === newPlan.id) {
    throw new ActivatePlanError('You are already on this plan', 400);
  }

  const now = new Date();
  let updatedTenant: {
    id: string;
    plan_id: string | null;
    scheduled_plan_id: string | null;
    expire_date: Date | null;
    status: string | null;
    country: string | null;
    price_plans?: {
      id: string;
      name: string;
      price: Prisma.Decimal;
      duration_months: number;
    } | null;
  } | undefined;
  let proratedAmount = 0;
  let effectiveDate = now;
  let shouldUseTrial = false;

  const previousUpgrades = await prisma.subscription_changes.count({
    where: { tenant_id: tenant.id, change_type: 'upgrade' },
  });
  const hasUpgradedBefore = previousUpgrades > 0;

  const tenantStartDate = tenant.start_date || tenant.created_at;
  const daysAsPayingCustomer = calculateDaysAsPayingCustomer(
    tenant.created_at,
    tenantStartDate,
    currentPlanPrice,
  );

  if (changeType === 'upgrade' || !currentPlan) {
    if (currentPlan && tenant.expire_date && tenant.expire_date > now) {
      const proration = calculateUpgradeProration(
        currentPlanPrice,
        newPlanPrice,
        tenant.expire_date,
        tenantStartDate,
      );
      proratedAmount = proration.proratedAmount;
    }

    shouldUseTrial =
      shouldOfferTrialOnUpgrade(currentPlanPrice, daysAsPayingCustomer, hasUpgradedBefore) &&
      !!newPlan.trial_days &&
      newPlan.trial_days > 0;

    let newExpireDate: Date;
    if (shouldUseTrial && newPlan.trial_days) {
      newExpireDate = new Date(now);
      newExpireDate.setDate(newExpireDate.getDate() + newPlan.trial_days);
    } else if (currentPlan && tenant.expire_date && tenant.expire_date > now) {
      newExpireDate = new Date(tenant.expire_date);
      newExpireDate.setMonth(newExpireDate.getMonth() + newPlan.duration_months);
    } else {
      newExpireDate = new Date(now);
      newExpireDate.setMonth(newExpireDate.getMonth() + newPlan.duration_months);
    }

    effectiveDate = now;

    const tenantWithData = await prisma.tenants.findUnique({
      where: { id: tenant.id },
      select: { data: true },
    });
    const currentData =
      tenantWithData?.data && typeof tenantWithData.data === 'object' && !Array.isArray(tenantWithData.data)
        ? (tenantWithData.data as Record<string, unknown>)
        : {};

    const updateData: {
      plan_id: string;
      expire_date: Date;
      status: string;
      upgrade_prorated_amount: number | null;
      scheduled_plan_id: null;
      scheduled_plan_change_date: null;
      data: Record<string, unknown>;
      start_date?: Date;
    } = {
      plan_id: input.planId,
      expire_date: newExpireDate,
      status: 'active',
      upgrade_prorated_amount: proratedAmount > 0 ? proratedAmount : null,
      scheduled_plan_id: null,
      scheduled_plan_change_date: null,
      data: {
        ...currentData,
        subscription: {
          currency: locationInfo.currency,
          currencySymbol: locationInfo.currencySymbol,
          price: resolvePlanMonthlyPrice(
            { price: newPlan.price, price_kes: newPlan.price_kes },
            locationInfo.isKenya,
          ),
          planName: newPlan.name,
        },
      },
    };

    if (shouldUseTrial) {
      updateData.start_date = now;
    } else if (tenant.start_date) {
      updateData.start_date = tenant.start_date;
    }

    updatedTenant = await prisma.tenants.update({
      where: { id: tenant.id },
      data: {
        ...updateData,
        data: updateData.data as Prisma.InputJsonValue,
      },
      include: {
        price_plans: {
          select: { id: true, name: true, price: true, duration_months: true },
        },
      },
    });

    try {
      await prisma.subscription_changes.create({
        data: {
          tenant_id: tenant.id,
          from_plan_id: currentPlan?.id || null,
          to_plan_id: newPlan.id,
          change_type: currentPlan ? 'upgrade' : 'activation',
          effective_date: effectiveDate,
          prorated_amount: proratedAmount > 0 ? proratedAmount : 0,
          status: 'completed',
          metadata: {
            trialUsed: shouldUseTrial,
            daysAsPayingCustomer,
            hasUpgradedBefore,
          },
        },
      });
    } catch (logError) {
      console.error('Error logging subscription change:', logError);
    }

    const updatedPlan = updatedTenant.price_plans;

    if (!currentPlan) {
      const isKenya = tenant.country === 'KE';
      sendSubscriptionActivatedEmail({
        tenant: updatedTenant as unknown as Parameters<
          typeof sendSubscriptionActivatedEmail
        >[0]['tenant'],
        plan: updatedPlan
          ? {
              name: updatedPlan.name,
              price: Number(updatedPlan.price),
              duration_months: updatedPlan.duration_months,
              currency: isKenya ? 'KES' : 'USD',
              currencySymbol: isKenya ? 'Ksh' : '$',
            }
          : null,
        expireDate: updatedTenant.expire_date || new Date(),
      }).catch(console.error);
    } else if (changeType === 'upgrade') {
      sendPlanUpgradeConfirmationEmail({
        tenant: updatedTenant as unknown as Parameters<
          typeof sendPlanUpgradeConfirmationEmail
        >[0]['tenant'],
        oldPlan: { name: currentPlan.name, price: currentPlanPrice },
        newPlan: {
          name: updatedPlan?.name || newPlan.name,
          price: newPlanPrice,
          duration_months: newPlan.duration_months,
        },
        expireDate: updatedTenant.expire_date || new Date(),
        proratedAmount: proratedAmount > 0 ? proratedAmount : undefined,
      }).catch(console.error);
    }
  } else if (changeType === 'downgrade') {
    if (!tenant.expire_date || tenant.expire_date <= now) {
      throw new ActivatePlanError('Cannot schedule downgrade: subscription has expired', 400);
    }

    const scheduledChangeDate = tenant.expire_date;

    const tenantWithData = await prisma.tenants.findUnique({
      where: { id: tenant.id },
      select: { data: true },
    });
    const currentData =
      tenantWithData?.data && typeof tenantWithData.data === 'object' && !Array.isArray(tenantWithData.data)
        ? (tenantWithData.data as Record<string, unknown>)
        : {};
    const existingSubscription =
      currentData.subscription && typeof currentData.subscription === 'object'
        ? (currentData.subscription as Record<string, unknown>)
        : {};

    updatedTenant = await prisma.tenants.update({
      where: { id: tenant.id },
      data: {
        scheduled_plan_id: input.planId,
        scheduled_plan_change_date: scheduledChangeDate,
        data: {
          ...currentData,
          subscription: {
            ...existingSubscription,
            scheduledDowngrade: {
              planId: input.planId,
              planName: newPlan.name,
              effectiveDate: scheduledChangeDate,
            },
          },
        } as Prisma.InputJsonValue,
      },
      include: {
        price_plans: {
          select: { id: true, name: true, price: true, duration_months: true },
        },
      },
    });

    effectiveDate = scheduledChangeDate;

    try {
      await prisma.subscription_changes.create({
        data: {
          tenant_id: tenant.id,
          from_plan_id: currentPlan?.id || null,
          to_plan_id: newPlan.id,
          change_type: 'downgrade',
          effective_date: scheduledChangeDate,
          scheduled_change_date: scheduledChangeDate,
          status: 'scheduled',
          metadata: {},
        },
      });
    } catch (logError) {
      console.error('Error logging subscription change:', logError);
    }

    if (currentPlan) {
      sendPlanDowngradeScheduledEmail({
        tenant: updatedTenant as unknown as Parameters<
          typeof sendPlanDowngradeScheduledEmail
        >[0]['tenant'],
        currentPlan: { name: currentPlan.name, price: currentPlanPrice },
        newPlan: {
          name: newPlan.name,
          price: newPlanPrice,
          duration_months: newPlan.duration_months,
        },
        effectiveDate: scheduledChangeDate,
      }).catch(console.error);
    }
  }

  if (!updatedTenant) {
    throw new ActivatePlanError('Failed to update subscription', 500);
  }

  let planData = updatedTenant.price_plans;
  if (changeType === 'downgrade') {
    const scheduledPlan = await prisma.price_plans.findUnique({
      where: { id: input.planId },
      select: { id: true, name: true, price: true, duration_months: true },
    });
    planData = scheduledPlan;
  }

  return {
    message:
      changeType === 'downgrade'
        ? 'Downgrade scheduled for next billing cycle'
        : 'Subscription activated successfully',
    changeType,
    tenant: {
      id: updatedTenant.id,
      planId: updatedTenant.plan_id,
      scheduledPlanId: updatedTenant.scheduled_plan_id,
      expireDate: updatedTenant.expire_date,
      status: updatedTenant.status,
    },
    plan: planData
      ? {
          id: planData.id,
          name: planData.name,
          price: Number(planData.price),
          durationMonths: planData.duration_months,
        }
      : null,
    proratedAmount: changeType === 'upgrade' ? proratedAmount : 0,
    effectiveDate: changeType === 'downgrade' ? effectiveDate : undefined,
    trialUsed: shouldUseTrial,
  };
}
