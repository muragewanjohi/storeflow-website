import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@prisma/client';
import {
  sendPlanUpgradeConfirmationEmail,
  sendSubscriptionActivatedEmail,
} from '@/lib/subscriptions/emails';
import { getPlanChangeType } from '@/lib/subscriptions/proration';
import { processReferralRewardForReferredTenant } from '@/lib/referrals/service';

export class CompleteSubscriptionPaymentError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'CompleteSubscriptionPaymentError';
  }
}

export type CompleteSubscriptionPaymentResult = {
  alreadyProcessed: boolean;
  subscriptionType: 'renewal' | 'upgrade' | 'activation';
  tenantId: string;
  planId: string;
};

/**
 * Activates or renews a tenant subscription after a successful subscription payment log.
 */
export async function completeSubscriptionFromPaymentLog(input: {
  paymentLogId: string;
  transactionReference?: string | null;
  paymentMethod: 'mpesa_buy_goods' | 'tumizi_subscription' | 'pesapal';
  rawMetadata?: Record<string, unknown>;
}): Promise<CompleteSubscriptionPaymentResult> {
  const paymentLog = await prisma.payment_logs.findUnique({
    where: { id: input.paymentLogId },
    include: {
      tenants: {
        include: {
          price_plans: true,
        },
      },
    },
  });

  if (!paymentLog) {
    throw new CompleteSubscriptionPaymentError('Payment not found', 404);
  }

  if (paymentLog.status === 'completed') {
    const meta = (paymentLog.metadata ?? {}) as Record<string, unknown>;
    return {
      alreadyProcessed: true,
      subscriptionType:
        (meta.subscription_type as CompleteSubscriptionPaymentResult['subscriptionType']) ||
        'activation',
      tenantId: paymentLog.tenant_id,
      planId: (meta.plan_id as string) || '',
    };
  }

  const tenant = paymentLog.tenants;
  if (!tenant) {
    throw new CompleteSubscriptionPaymentError('Tenant not found', 404);
  }

  const metadata = (paymentLog.metadata ?? {}) as Record<string, unknown>;
  const planId = metadata.plan_id as string | undefined;
  if (!planId) {
    throw new CompleteSubscriptionPaymentError('Plan not found on payment', 400);
  }

  const plan = await prisma.price_plans.findUnique({
    where: { id: planId },
  });
  if (!plan) {
    throw new CompleteSubscriptionPaymentError('Plan not found', 404);
  }

  const currentPlan = tenant.plan_id
    ? await prisma.price_plans.findUnique({
        where: { id: tenant.plan_id },
      })
    : null;

  const now = new Date();
  const currentPlanPrice = currentPlan ? Number(currentPlan.price) : 0;
  const newPlanPrice = Number(plan.price);
  const changeType = getPlanChangeType(currentPlanPrice, newPlanPrice);

  const isRenewal =
    currentPlan &&
    planId === currentPlan.id &&
    tenant.expire_date &&
    new Date(tenant.expire_date) > now;
  const subscriptionType: CompleteSubscriptionPaymentResult['subscriptionType'] = isRenewal
    ? 'renewal'
    : changeType === 'upgrade'
      ? 'upgrade'
      : 'activation';

  await prisma.payment_logs.update({
    where: { id: paymentLog.id },
    data: {
      status: 'completed',
      transaction_id: input.transactionReference || paymentLog.transaction_id,
      metadata: {
        ...metadata,
        ...(input.rawMetadata ?? {}),
        subscription_type: subscriptionType,
        completed_at: new Date().toISOString(),
        payment_method: input.paymentMethod,
      } as Prisma.InputJsonValue,
    },
  });

  let newExpireDate: Date;
  if (currentPlan && tenant.expire_date && new Date(tenant.expire_date) > now) {
    newExpireDate = new Date(tenant.expire_date);
    newExpireDate.setMonth(newExpireDate.getMonth() + plan.duration_months);
  } else {
    newExpireDate = new Date(now);
    newExpireDate.setMonth(newExpireDate.getMonth() + plan.duration_months);
  }

  const updatedTenant = await prisma.tenants.update({
    where: { id: tenant.id },
    data: {
      plan_id: planId,
      expire_date: newExpireDate,
      status: 'active',
      scheduled_plan_id: null,
      scheduled_plan_change_date: null,
    },
    include: {
      price_plans: true,
    },
  });

  await prisma.subscription_changes.create({
    data: {
      tenant_id: tenant.id,
      from_plan_id: currentPlan?.id || null,
      to_plan_id: planId,
      change_type:
        subscriptionType === 'renewal'
          ? 'renewal'
          : currentPlan
            ? changeType === 'upgrade'
              ? 'upgrade'
              : 'activation'
            : 'activation',
      effective_date: now,
      prorated_amount: Number(metadata.prorated_amount) || 0,
      status: 'completed',
      metadata: {
        payment_log_id: paymentLog.id,
        transaction_reference: input.transactionReference ?? null,
        payment_method: input.paymentMethod,
      },
    },
  });

  await processReferralRewardForReferredTenant({
    referredTenantId: tenant.id,
    paymentLogId: paymentLog.id,
  });

  if (currentPlan && changeType === 'upgrade') {
    sendPlanUpgradeConfirmationEmail({
      tenant: updatedTenant as any,
      oldPlan: {
        name: currentPlan.name,
        price: currentPlanPrice,
      },
      newPlan: {
        name: plan.name,
        price: newPlanPrice,
        duration_months: plan.duration_months,
      },
      expireDate: newExpireDate,
      proratedAmount: Number(metadata.prorated_amount) || undefined,
    }).catch((error) => {
      console.error('[Subscription Payment] Error sending upgrade email:', error);
    });
  } else {
    const amountPaid = Number(paymentLog.amount);
    const currencyCode = paymentLog.currency ?? (tenant.country === 'KE' ? 'KES' : 'USD');
    const monthsToAdd = (metadata.months_to_add as number) ?? plan.duration_months;
    sendSubscriptionActivatedEmail({
      tenant: updatedTenant as any,
      plan: {
        name: plan.name,
        price: amountPaid,
        duration_months: monthsToAdd,
        currency: currencyCode === 'KES' ? 'KES' : 'USD',
        currencySymbol: currencyCode === 'KES' ? 'Ksh' : '$',
      },
      expireDate: newExpireDate,
    }).catch((error) => {
      console.error('[Subscription Payment] Error sending activation email:', error);
    });
  }

  return {
    alreadyProcessed: false,
    subscriptionType,
    tenantId: tenant.id,
    planId,
  };
}
