import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@prisma/client';
import { getMpesaService } from '@/lib/mpesa/mpesa-service';
import { buildWebhookUrlWithToken } from '@/lib/payments/webhook-auth';
import {
  calculateUpgradeProration,
  getPlanChangeType,
} from '@/lib/subscriptions/proration';

export class MpesaSubscriptionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'MpesaSubscriptionError';
  }
}

export async function initiateMpesaSubscriptionPayment(input: {
  tenantId: string;
  userId: string;
  planId: string;
  phoneNumber: string;
}) {
  const tenant = await prisma.tenants.findUnique({
    where: { id: input.tenantId, deleted_at: null },
  });

  if (!tenant) {
    throw new MpesaSubscriptionError('Tenant not found', 404);
  }

  const plan = await prisma.price_plans.findUnique({ where: { id: input.planId } });
  if (!plan || plan.status !== 'active') {
    throw new MpesaSubscriptionError('Plan not found or inactive', 404);
  }

  const currentPlan = tenant.plan_id
    ? await prisma.price_plans.findUnique({ where: { id: tenant.plan_id } })
    : null;

  const currentPlanPrice = currentPlan ? Number(currentPlan.price) : 0;
  const newPlanPrice = Number(plan.price);
  const changeType = getPlanChangeType(currentPlanPrice, newPlanPrice);

  let amount = newPlanPrice;
  let proratedAmount = 0;

  if (changeType === 'upgrade' && currentPlan && tenant.expire_date) {
    const now = new Date();
    const expireDate = new Date(tenant.expire_date);
    if (expireDate > now) {
      const tenantStartDate = tenant.start_date || tenant.created_at;
      const proration = calculateUpgradeProration(
        currentPlanPrice,
        newPlanPrice,
        expireDate,
        tenantStartDate,
      );
      proratedAmount = proration.proratedAmount;
      amount = proratedAmount;
    }
  }

  if (amount <= 0) {
    throw new MpesaSubscriptionError('Invalid payment amount. Please contact support.', 400);
  }

  const accountReference = `SUB-${tenant.id.slice(0, 8).toUpperCase()}-${Date.now()}`;

  const paymentLog = await prisma.payment_logs.create({
    data: {
      tenant_id: tenant.id,
      user_id: input.userId,
      gateway: 'mpesa_buy_goods',
      amount,
      currency: 'KES',
      status: 'pending',
      metadata: {
        plan_id: input.planId,
        plan_name: plan.name,
        phone_number: input.phoneNumber,
        account_reference: accountReference,
        prorated_amount: proratedAmount,
        is_upgrade: changeType === 'upgrade',
        is_new_subscription: !currentPlan,
        change_type: changeType,
      },
    },
  });

  const callbackUrlBase =
    process.env.MPESA_CALLBACK_URL ||
    (process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/mpesa/subscription/callback`
      : 'https://dukanest.com/api/mpesa/subscription/callback');
  const callbackUrl = buildWebhookUrlWithToken(callbackUrlBase);

  const mpesaService = getMpesaService();
  const stkResponse = await mpesaService.initiateStkPush({
    phoneNumber: input.phoneNumber,
    amount,
    accountReference,
    transactionDesc: `Subscription: ${plan.name}`,
    callbackUrl,
  });

  await prisma.payment_logs.update({
    where: { id: paymentLog.id },
    data: {
      payment_id: stkResponse.checkoutRequestID,
      transaction_id: stkResponse.merchantRequestID,
      metadata: {
        ...(paymentLog.metadata as Record<string, unknown>),
        checkout_request_id: stkResponse.checkoutRequestID,
        merchant_request_id: stkResponse.merchantRequestID,
        callback_url: callbackUrl,
      },
    },
  });

  return {
    message: stkResponse.customerMessage,
    checkoutRequestId: stkResponse.checkoutRequestID,
    paymentLogId: paymentLog.id,
    amount,
    currency: 'KES',
    changeType,
    proratedAmount,
  };
}

const statusMap: Record<string, string> = {
  '1032': 'cancelled',
  '1037': 'timeout',
  '1': 'failed',
};

export async function queryMpesaSubscriptionPaymentStatus(input: {
  tenantId: string;
  checkoutRequestId: string;
}) {
  const paymentLog = await prisma.payment_logs.findFirst({
    where: {
      payment_id: input.checkoutRequestId,
      tenant_id: input.tenantId,
      gateway: 'mpesa_buy_goods',
    },
  });

  if (!paymentLog) {
    throw new MpesaSubscriptionError('Payment not found', 404);
  }

  if (paymentLog.status === 'completed') {
    const meta = (paymentLog.metadata ?? {}) as Record<string, unknown>;
    return {
      status: 'completed' as const,
      subscriptionType: (meta.subscription_type as string) || 'activation',
      mpesaResult: null,
      paymentLog: {
        id: paymentLog.id,
        amount: Number(paymentLog.amount),
        transactionId: paymentLog.transaction_id,
        status: paymentLog.status,
      },
    };
  }

  if (paymentLog.status === 'pending') {
    try {
      const mpesaService = getMpesaService();
      const queryResult = await mpesaService.queryStkPushStatus(input.checkoutRequestId);

      if (queryResult.ResultCode === '0') {
        await prisma.payment_logs.update({
          where: { id: paymentLog.id },
          data: {
            status: 'completed',
            metadata: {
              ...(paymentLog.metadata as Record<string, unknown>),
              query_result: queryResult as unknown as Prisma.InputJsonValue,
              last_queried_at: new Date().toISOString(),
            },
          },
        });
      } else {
        const newStatus = statusMap[queryResult.ResultCode] || 'pending';
        if (paymentLog.status !== newStatus) {
          await prisma.payment_logs.update({
            where: { id: paymentLog.id },
            data: {
              status: newStatus,
              metadata: {
                ...(paymentLog.metadata as Record<string, unknown>),
                query_result: queryResult as unknown as Prisma.InputJsonValue,
                last_queried_at: new Date().toISOString(),
              },
            },
          });
        }
      }

      const updated = await prisma.payment_logs.findUnique({ where: { id: paymentLog.id } });
      const row = updated ?? paymentLog;
      const meta = (row.metadata ?? {}) as Record<string, unknown>;

      return {
        status: row.status ?? 'pending',
        subscriptionType:
          row.status === 'completed'
            ? ((meta.subscription_type as string) || 'activation')
            : undefined,
        mpesaResult: {
          resultCode: queryResult.ResultCode,
          resultDesc: queryResult.ResultDesc,
        },
        paymentLog: {
          id: row.id,
          amount: Number(row.amount),
          transactionId: row.transaction_id,
          status: row.status,
        },
      };
    } catch (queryError) {
      console.error('[Mpesa Subscription Status] Query error:', queryError);
      return {
        status: paymentLog.status ?? 'pending',
        subscriptionType: undefined,
        mpesaResult: null,
        paymentLog: {
          id: paymentLog.id,
          amount: Number(paymentLog.amount),
          transactionId: paymentLog.transaction_id,
          status: paymentLog.status,
        },
        queryError: 'Failed to query M-Pesa status',
      };
    }
  }

  return {
    status: paymentLog.status ?? 'pending',
    subscriptionType: undefined,
    mpesaResult: null,
    paymentLog: {
      id: paymentLog.id,
      amount: Number(paymentLog.amount),
      transactionId: paymentLog.transaction_id,
      status: paymentLog.status,
    },
  };
}
