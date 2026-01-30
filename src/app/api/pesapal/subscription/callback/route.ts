/**
 * GET /api/pesapal/subscription/callback
 *
 * PesaPal redirects the user here after payment. We verify status via GetTransactionStatus,
 * then activate subscription and redirect to dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import {
  getTransactionStatus,
  isTransactionCompleted,
} from '@/lib/pesapal/pesapal-service';
import {
  sendSubscriptionActivatedEmail,
  sendPlanUpgradeConfirmationEmail,
} from '@/lib/subscriptions/emails';
import { getPlanChangeType } from '@/lib/subscriptions/proration';

export const dynamic = 'force-dynamic';

const subscriptionPagePath = '/dashboard/subscription';
const embedDonePath = '/dashboard/subscription/pesapal-done';

function redirectUrl(request: NextRequest, path: string, params: Record<string, string>): string {
  const base = request.nextUrl.origin;
  const search = new URLSearchParams(params).toString();
  return `${base}${path}${search ? `?${search}` : ''}`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderTrackingId = searchParams.get('OrderTrackingId');
  const orderMerchantReference = searchParams.get('OrderMerchantReference');
  const orderNotificationType = searchParams.get('OrderNotificationType');

  const embed = searchParams.get('embed') === '1';
  const donePath = embed ? embedDonePath : subscriptionPagePath;

  if (!orderTrackingId || !orderMerchantReference) {
    return NextResponse.redirect(
      redirectUrl(request, donePath, { error: 'missing_params' })
    );
  }

  try {
    const statusResult = await getTransactionStatus(orderTrackingId);

    if (!isTransactionCompleted(statusResult)) {
      const reason =
        statusResult.payment_status_description?.toLowerCase() ?? 'failed';
      return NextResponse.redirect(
        redirectUrl(request, donePath, { error: 'payment_failed', reason })
      );
    }

    const paymentLog = await prisma.payment_logs.findFirst({
      where: {
        id: orderMerchantReference,
        gateway: 'pesapal',
      },
      include: {
        tenants: {
          include: {
            price_plans: true,
          },
        },
      },
    });

    if (!paymentLog) {
      return NextResponse.redirect(
        redirectUrl(request, donePath, { error: 'payment_not_found' })
      );
    }

    if (paymentLog.status === 'completed') {
      return NextResponse.redirect(
        redirectUrl(request, donePath, { success: '1' })
      );
    }

    const tenant = paymentLog.tenants;
    const metadata = (paymentLog.metadata ?? {}) as Record<string, unknown>;
    const planId = metadata.plan_id as string;
    const billingInterval = (metadata.billing_interval as 'monthly' | 'yearly') ?? 'monthly';
    const monthsToAdd = (metadata.months_to_add as number) ?? (billingInterval === 'yearly' ? 12 : 1);

    const plan = await prisma.price_plans.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      await prisma.payment_logs.update({
        where: { id: paymentLog.id },
        data: { status: 'failed', metadata: { ...metadata, error: 'plan_not_found' } },
      });
      return NextResponse.redirect(
        redirectUrl(request, donePath, { error: 'plan_not_found' })
      );
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

    let newExpireDate: Date;
    if (currentPlan && tenant.expire_date && new Date(tenant.expire_date) > now) {
      newExpireDate = new Date(tenant.expire_date);
      newExpireDate.setMonth(newExpireDate.getMonth() + monthsToAdd);
    } else {
      newExpireDate = new Date(now);
      newExpireDate.setMonth(newExpireDate.getMonth() + monthsToAdd);
    }

    await prisma.payment_logs.update({
      where: { id: paymentLog.id },
      data: {
        status: 'completed',
        transaction_id: orderTrackingId,
        payment_id: statusResult.confirmation_code ?? orderTrackingId,
        metadata: {
          ...metadata,
          confirmation_code: statusResult.confirmation_code,
          payment_status_description: statusResult.payment_status_description,
        },
      },
    });

    await prisma.tenants.update({
      where: { id: tenant.id },
      data: {
        plan_id: planId,
        expire_date: newExpireDate,
        status: 'active',
        scheduled_plan_id: null,
        scheduled_plan_change_date: null,
      },
    });

    const updatedTenant = await prisma.tenants.findUnique({
      where: { id: tenant.id },
      include: { price_plans: true },
    });

    await prisma.subscription_changes.create({
      data: {
        tenant_id: tenant.id,
        from_plan_id: currentPlan?.id ?? null,
        to_plan_id: planId,
        change_type: currentPlan
          ? changeType === 'upgrade'
            ? 'upgrade'
            : 'activation'
          : 'activation',
        effective_date: now,
        prorated_amount: (metadata.prorated_amount as number) ?? 0,
        status: 'completed',
        metadata: {
          payment_log_id: paymentLog.id,
          gateway: 'pesapal',
          order_tracking_id: orderTrackingId,
          billing_interval: billingInterval,
        },
      },
    });

    if (currentPlan && changeType === 'upgrade' && updatedTenant) {
      sendPlanUpgradeConfirmationEmail({
        tenant: updatedTenant as any,
        oldPlan: { name: currentPlan.name, price: currentPlanPrice },
        newPlan: {
          name: plan.name,
          price: newPlanPrice,
          duration_months: plan.duration_months,
        },
        expireDate: newExpireDate,
        proratedAmount: (metadata.prorated_amount as number) || undefined,
      }).catch((err) => console.error('[PesaPal Callback] Upgrade email error:', err));
    } else if (updatedTenant) {
      sendSubscriptionActivatedEmail({
        tenant: updatedTenant as any,
        plan: {
          name: plan.name,
          price: newPlanPrice,
          duration_months: plan.duration_months,
        },
        expireDate: newExpireDate,
      }).catch((err) => console.error('[PesaPal Callback] Activation email error:', err));
    }

    return NextResponse.redirect(
      redirectUrl(request, donePath, { success: '1' })
    );
  } catch (error) {
    console.error('[PesaPal Callback] Error:', error);
    return NextResponse.redirect(
      redirectUrl(request, donePath, {
        error: 'callback_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    );
  }
}
