/**
 * GET/POST /api/pesapal/subscription/ipn
 *
 * PesaPal server-to-server Instant Payment Notification.
 * Handle both one-time (IPNCHANGE) and recurring (RECURRING) notifications.
 * Respond with JSON status 200 or 500.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import {
  getTransactionStatus,
  isTransactionCompleted,
} from '@/lib/pesapal/pesapal-service';
import { sendSubscriptionActivatedEmail } from '@/lib/subscriptions/emails';

export const dynamic = 'force-dynamic';

async function getIpnParams(request: NextRequest): Promise<{
  orderTrackingId: string | null;
  orderMerchantReference: string | null;
  orderNotificationType: string | null;
}> {
  const searchParams = request.nextUrl.searchParams;
  let orderTrackingId = searchParams.get('OrderTrackingId');
  let orderMerchantReference = searchParams.get('OrderMerchantReference');
  let orderNotificationType = searchParams.get('OrderNotificationType');

  if (request.method === 'POST') {
    try {
      const parsed = await request.json().catch(() => null);
      if (parsed && typeof parsed === 'object') {
        orderTrackingId = orderTrackingId ?? parsed.OrderTrackingId ?? null;
        orderMerchantReference =
          orderMerchantReference ?? parsed.OrderMerchantReference ?? null;
        orderNotificationType =
          orderNotificationType ?? parsed.OrderNotificationType ?? null;
      }
    } catch {
      // keep query params
    }
  }
  return { orderTrackingId, orderMerchantReference, orderNotificationType };
}

function ipnResponse(
  orderNotificationType: string,
  orderTrackingId: string,
  orderMerchantReference: string,
  status: 200 | 500
): NextResponse {
  return NextResponse.json(
    {
      orderNotificationType,
      orderTrackingId,
      orderMerchantReference,
      status,
    },
    { status: 200 }
  );
}

export async function GET(request: NextRequest) {
  return handleIpn(request);
}

export async function POST(request: NextRequest) {
  return handleIpn(request);
}

async function handleIpn(request: NextRequest): Promise<NextResponse> {
  const { orderTrackingId, orderMerchantReference, orderNotificationType } =
    await getIpnParams(request);

  if (!orderTrackingId || !orderMerchantReference) {
    return NextResponse.json(
      { error: 'Missing OrderTrackingId or OrderMerchantReference' },
      { status: 400 }
    );
  }

  const notifType = orderNotificationType ?? 'IPNCHANGE';

  try {
    const statusResult = await getTransactionStatus(orderTrackingId);

    if (!isTransactionCompleted(statusResult)) {
      return ipnResponse(notifType, orderTrackingId, orderMerchantReference, 200);
    }

    if (notifType === 'RECURRING') {
      const accountRef =
        statusResult.subscription_transaction_info?.account_reference ?? orderMerchantReference;
      const tenant = await prisma.tenants.findUnique({
        where: { id: accountRef },
        include: { price_plans: true },
      });
      if (tenant?.plan_id && tenant.expire_date) {
        const plan = tenant.price_plans;
        if (plan) {
          const newExpire = new Date(tenant.expire_date);
          newExpire.setMonth(newExpire.getMonth() + plan.duration_months);
          await prisma.tenants.update({
            where: { id: tenant.id },
            data: { expire_date: newExpire, status: 'active' },
          });
          await prisma.payment_logs.create({
            data: {
              tenant_id: tenant.id,
              gateway: 'pesapal',
              amount: statusResult.amount ?? plan.price,
              currency: statusResult.currency ?? 'KES',
              status: 'completed',
              payment_id: orderTrackingId,
              transaction_id: statusResult.confirmation_code ?? orderTrackingId,
              metadata: {
                billing_interval: 'recurring',
                plan_id: plan.id,
                order_tracking_id: orderTrackingId,
                subscription_transaction_info: statusResult.subscription_transaction_info,
              },
            },
          });
        }
      }
      return ipnResponse(notifType, orderTrackingId, orderMerchantReference, 200);
    }

    const paymentLog = await prisma.payment_logs.findFirst({
      where: {
        id: orderMerchantReference,
        gateway: 'pesapal',
      },
      include: { tenants: { include: { price_plans: true } } },
    });

    if (!paymentLog || paymentLog.status === 'completed') {
      return ipnResponse(notifType, orderTrackingId, orderMerchantReference, 200);
    }

    const metadata = (paymentLog.metadata ?? {}) as Record<string, unknown>;
    const planId = metadata.plan_id as string;
    const billingInterval = (metadata.billing_interval as 'monthly' | 'yearly') ?? 'monthly';
    const monthsToAdd = (metadata.months_to_add as number) ?? (billingInterval === 'yearly' ? 12 : 1);

    const plan = await prisma.price_plans.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      return ipnResponse(notifType, orderTrackingId, orderMerchantReference, 500);
    }

    const tenant = paymentLog.tenants;
    const now = new Date();
    const currentPlan = tenant.plan_id
      ? await prisma.price_plans.findUnique({ where: { id: tenant.plan_id } })
      : null;

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
          ipn_received_at: new Date().toISOString(),
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

    await prisma.subscription_changes.create({
      data: {
        tenant_id: tenant.id,
        from_plan_id: currentPlan?.id ?? null,
        to_plan_id: planId,
        change_type: currentPlan ? 'activation' : 'activation',
        effective_date: now,
        prorated_amount: (metadata.prorated_amount as number) ?? 0,
        status: 'completed',
        metadata: {
          payment_log_id: paymentLog.id,
          gateway: 'pesapal',
          order_tracking_id: orderTrackingId,
          source: 'ipn',
        },
      },
    });

    const updatedTenant = await prisma.tenants.findUnique({
      where: { id: tenant.id },
      include: { price_plans: true },
    });
    if (updatedTenant) {
      sendSubscriptionActivatedEmail({
        tenant: updatedTenant as any,
        plan: {
          name: plan.name,
          price: Number(plan.price),
          duration_months: plan.duration_months,
        },
        expireDate: newExpireDate,
      }).catch((err) => console.error('[PesaPal IPN] Email error:', err));
    }

    return ipnResponse(notifType, orderTrackingId, orderMerchantReference, 200);
  } catch (error) {
    console.error('[PesaPal IPN] Error:', error);
    return ipnResponse(
      notifType,
      orderTrackingId,
      orderMerchantReference,
      500
    );
  }
}
