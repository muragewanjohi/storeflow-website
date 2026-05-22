import { prisma } from '@/lib/prisma/client';
import {
  submitOrderRequest,
  type BillingAddress,
  type SubmitOrderParams,
} from '@/lib/pesapal/pesapal-service';
import { pesapalConfig, getYearlyPrice } from '@/lib/pesapal/config';
import { getLocalizedPrice } from '@/lib/pricing/location';
import {
  calculateUpgradeProration,
  getPlanChangeType,
} from '@/lib/subscriptions/proration';
import { buildWebhookUrlWithToken } from '@/lib/payments/webhook-auth';

export class PesapalSubscriptionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'PesapalSubscriptionError';
  }
}

function formatDateDDMMYYYY(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export async function initiatePesapalSubscriptionPayment(input: {
  tenantId: string;
  userId: string;
  userEmail: string;
  planId: string;
  billingInterval: 'monthly' | 'yearly';
  enableRecurring?: boolean;
  embed?: boolean;
}) {
  const tenant = await prisma.tenants.findUnique({
    where: { id: input.tenantId, deleted_at: null },
  });

  if (!tenant) {
    throw new PesapalSubscriptionError('Tenant not found', 404);
  }

  const plan = await prisma.price_plans.findUnique({ where: { id: input.planId } });
  if (!plan || plan.status !== 'active') {
    throw new PesapalSubscriptionError('Plan not found or inactive', 404);
  }

  const currentPlan = tenant.plan_id
    ? await prisma.price_plans.findUnique({ where: { id: tenant.plan_id } })
    : null;

  const tenantData =
    tenant.data && typeof tenant.data === 'object' && !Array.isArray(tenant.data)
      ? (tenant.data as Record<string, unknown>)
      : {};
  const isDemoStore = tenantData.is_demo === true || tenantData.isDemo === true;
  const isKenya = tenant.country === 'KE';

  const monthlyPlanPrice = Number(plan.price);
  const monthlyPrice = isKenya
    ? getLocalizedPrice(plan.name, true, monthlyPlanPrice, isDemoStore)
    : monthlyPlanPrice;
  const currentPlanPrice = currentPlan
    ? isKenya
      ? getLocalizedPrice(currentPlan.name, true, Number(currentPlan.price), isDemoStore)
      : Number(currentPlan.price)
    : 0;
  const changeType = getPlanChangeType(currentPlanPrice, monthlyPrice);

  let amount: number;
  let monthsToAdd: number;

  if (input.billingInterval === 'yearly') {
    amount = getYearlyPrice(monthlyPrice);
    monthsToAdd = 12;
  } else {
    amount = monthlyPrice;
    monthsToAdd = 1;
  }

  if (changeType === 'upgrade' && currentPlan && tenant.expire_date) {
    const now = new Date();
    const expireDate = new Date(tenant.expire_date);
    if (expireDate > now) {
      const tenantStartDate = tenant.start_date ?? tenant.created_at;
      const newPlanPriceForProration = input.billingInterval === 'yearly' ? amount / 12 : amount;
      const proration = calculateUpgradeProration(
        currentPlanPrice,
        newPlanPriceForProration,
        expireDate,
        tenantStartDate,
      );
      if (proration.proratedAmount > 0) {
        amount = proration.proratedAmount;
      }
    }
  }

  if (amount <= 0) {
    throw new PesapalSubscriptionError('Invalid payment amount. Please contact support.', 400);
  }

  const notificationId = pesapalConfig.notificationId;
  if (!notificationId) {
    throw new PesapalSubscriptionError(
      'PesaPal IPN is not configured. Please set PESAPAL_NOTIFICATION_ID after registering your IPN URL.',
      500,
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
  const callbackPath = input.embed
    ? '/api/pesapal/subscription/callback?embed=1'
    : '/api/pesapal/subscription/callback';
  const callbackUrl = buildWebhookUrlWithToken(`${appUrl}${callbackPath}`);
  const cancellationUrl = input.embed
    ? `${appUrl}/dashboard/subscription/pesapal-done?cancelled=1`
    : `${appUrl}/dashboard/subscription`;

  const paymentLog = await prisma.payment_logs.create({
    data: {
      tenant_id: tenant.id,
      user_id: input.userId,
      gateway: 'pesapal',
      amount,
      currency: isKenya ? 'KES' : 'USD',
      status: 'pending',
      metadata: {
        plan_id: input.planId,
        plan_name: plan.name,
        billing_interval: input.billingInterval,
        months_to_add: monthsToAdd,
        tenant_id: tenant.id,
      },
    },
  });

  const nameParts = (tenant.name || 'Customer').trim().split(/\s+/);
  const first_name = nameParts[0] ?? 'Customer';
  const last_name = nameParts.slice(1).join(' ') || first_name;

  const billing_address: BillingAddress = {
    email_address: input.userEmail || tenant.contact_email || 'customer@example.com',
    country_code: tenant.country ?? 'KE',
    first_name,
    last_name,
    line_1: tenant.name ?? 'N/A',
  };

  const params: SubmitOrderParams = {
    id: paymentLog.id,
    currency: isKenya ? 'KES' : 'USD',
    amount,
    description: `Subscription: ${plan.name} (${input.billingInterval})`,
    callback_url: callbackUrl,
    notification_id: notificationId,
    billing_address,
    cancellation_url: cancellationUrl,
    account_number: tenant.id,
  };

  if (input.enableRecurring) {
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + monthsToAdd);
    params.subscription_details = {
      start_date: formatDateDDMMYYYY(start),
      end_date: formatDateDDMMYYYY(end),
      frequency: input.billingInterval === 'yearly' ? 'YEARLY' : 'MONTHLY',
    };
  }

  const result = await submitOrderRequest(params);

  await prisma.payment_logs.update({
    where: { id: paymentLog.id },
    data: {
      payment_id: result.order_tracking_id,
      metadata: {
        ...(paymentLog.metadata as object),
        order_tracking_id: result.order_tracking_id,
        merchant_reference: result.merchant_reference,
        callback_url: callbackUrl,
      },
    },
  });

  return {
    redirectUrl: result.redirect_url,
    paymentLogId: paymentLog.id,
    orderTrackingId: result.order_tracking_id,
    amount,
    currency: isKenya ? 'KES' : 'USD',
    changeType,
  };
}
