import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@prisma/client';
import { tumiziClient, TumiziApiError } from '@/lib/tumizi/client';
import { resolveTumiziPartnerWalletAccountNumber } from '@/lib/tumizi/partner-wallet';
import { normalizeKenyaMsisdnForTumizi } from '@/lib/tumizi/phone';
import {
  extractTumiziCustomerPaymentStatus,
} from '@/lib/tumizi/apply-payment-status';
import { mapTumiziStatusToOrderPaymentStatus } from '@/lib/tumizi/webhook';
import {
  calculateUpgradeProration,
  getPlanChangeType,
} from '@/lib/subscriptions/proration';
import {
  applyTumiziSubscriptionPaymentStatus,
} from '@/lib/tumizi/apply-subscription-payment';

export class TumiziSubscriptionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'TumiziSubscriptionError';
  }
}

export const TUMIZI_SUBSCRIPTION_GATEWAY = 'tumizi_subscription';

function readCustomerMessage(response: Record<string, unknown>): string {
  const data = response.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const message = (data as Record<string, unknown>).customer_message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }
  return 'Check your phone to approve the M-Pesa payment request.';
}

export async function initiateTumiziSubscriptionPayment(input: {
  tenantId: string;
  userId: string;
  planId: string;
  phoneNumber: string;
  payerName?: string;
  payerEmail?: string;
}) {
  const tenant = await prisma.tenants.findUnique({
    where: { id: input.tenantId, deleted_at: null },
  });

  if (!tenant) {
    throw new TumiziSubscriptionError('Tenant not found', 404);
  }

  const plan = await prisma.price_plans.findUnique({ where: { id: input.planId } });
  if (!plan || plan.status !== 'active') {
    throw new TumiziSubscriptionError('Plan not found or inactive', 404);
  }

  const msisdn = normalizeKenyaMsisdnForTumizi(input.phoneNumber);
  if (!msisdn) {
    throw new TumiziSubscriptionError(
      'Invalid phone number format. Use 254XXXXXXXXX or 0XXXXXXXXX',
      400,
    );
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
    throw new TumiziSubscriptionError('Invalid payment amount. Please contact support.', 400);
  }

  const externalReference = `sub-${tenant.id.slice(0, 8)}-${Date.now()}`;
  const accountReference = `SUB-${tenant.id.slice(0, 8).toUpperCase()}-${Date.now()}`;
  const walletAccountNumber = await resolveTumiziPartnerWalletAccountNumber();

  const paymentLog = await prisma.payment_logs.create({
    data: {
      tenant_id: tenant.id,
      user_id: input.userId,
      gateway: TUMIZI_SUBSCRIPTION_GATEWAY,
      amount,
      currency: 'KES',
      status: 'pending',
      payment_id: externalReference,
      metadata: {
        plan_id: input.planId,
        plan_name: plan.name,
        phone_number: msisdn,
        account_reference: accountReference,
        external_reference: externalReference,
        prorated_amount: proratedAmount,
        is_upgrade: changeType === 'upgrade',
        is_new_subscription: !currentPlan,
        change_type: changeType,
        source: 'tumizi_subscription_payment',
      },
    },
  });

  const response = await tumiziClient
    .createPartnerCustomerPayment({
      external_reference: externalReference,
      source: {
        wallet_account_number: walletAccountNumber,
      },
      payer: {
        phone_number: msisdn,
        name: input.payerName?.trim() || tenant.name?.trim() || 'DukaNest Merchant',
        email: input.payerEmail?.trim() || tenant.contact_email || undefined,
      },
      amount,
      currency: 'KES',
      account_reference: accountReference,
      description: `Subscription: ${plan.name}`,
    })
    .catch(async (error) => {
      await prisma.payment_logs.update({
        where: { id: paymentLog.id },
        data: {
          status: 'failed',
          metadata: {
            ...(paymentLog.metadata as Record<string, unknown>),
            tumizi_error:
              error instanceof TumiziApiError
                ? { message: error.message, code: error.code, status: error.status }
                : String(error),
          } as Prisma.InputJsonValue,
        },
      });

      if (error instanceof TumiziApiError) {
        throw new TumiziSubscriptionError(
          error.message,
          error.status >= 400 && error.status < 500 ? error.status : 502,
        );
      }
      throw error;
    });

  const { transactionReference } = extractTumiziCustomerPaymentStatus(response);

  await prisma.payment_logs.update({
    where: { id: paymentLog.id },
    data: {
      transaction_id: transactionReference || paymentLog.transaction_id,
      metadata: {
        ...(paymentLog.metadata as Record<string, unknown>),
        tumizi_response: response as unknown as Prisma.InputJsonValue,
      },
    },
  });

  return {
    message: readCustomerMessage(response),
    externalReference,
    checkoutRequestId: externalReference,
    paymentLogId: paymentLog.id,
    amount,
    currency: 'KES' as const,
    changeType,
    proratedAmount,
  };
}

export async function queryTumiziSubscriptionPaymentStatus(input: {
  tenantId: string;
  externalReference: string;
}) {
  const paymentLog = await prisma.payment_logs.findFirst({
    where: {
      tenant_id: input.tenantId,
      gateway: TUMIZI_SUBSCRIPTION_GATEWAY,
      OR: [
        { payment_id: input.externalReference },
        { transaction_id: input.externalReference },
      ],
    },
  });

  if (!paymentLog) {
    throw new TumiziSubscriptionError('Payment not found', 404);
  }

  const externalReference = paymentLog.payment_id || input.externalReference;
  const meta = (paymentLog.metadata ?? {}) as Record<string, unknown>;

  if (paymentLog.status === 'completed') {
    return {
      status: 'completed' as const,
      subscriptionType: (meta.subscription_type as string) || 'activation',
      tumiziResult: null,
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
      const tumiziResponse = await tumiziClient.getPartnerCustomerPayment(externalReference);
      const { status: tumiziStatus, transactionReference } =
        extractTumiziCustomerPaymentStatus(tumiziResponse);
      const mapped = mapTumiziStatusToOrderPaymentStatus(tumiziStatus);

      if (mapped === 'paid') {
        await applyTumiziSubscriptionPaymentStatus({
          tenantId: input.tenantId,
          externalReference,
          tumiziStatus,
          transactionReference,
          event: 'partner.customer_payment.updated',
          rawPayload: tumiziResponse,
        });
      } else if (mapped === 'failed') {
        await prisma.payment_logs.update({
          where: { id: paymentLog.id },
          data: {
            status: 'failed',
            metadata: {
              ...meta,
              tumizi_status: tumiziStatus,
              tumizi_synced_at: new Date().toISOString(),
              tumizi_payload: tumiziResponse as unknown as Prisma.InputJsonValue,
            },
          },
        });
      }

      const updated = await prisma.payment_logs.findUnique({ where: { id: paymentLog.id } });
      const row = updated ?? paymentLog;
      const updatedMeta = (row.metadata ?? {}) as Record<string, unknown>;

      return {
        status: row.status ?? 'pending',
        subscriptionType:
          row.status === 'completed'
            ? ((updatedMeta.subscription_type as string) || 'activation')
            : undefined,
        tumiziResult: {
          status: tumiziStatus ?? null,
          mappedStatus: mapped,
        },
        paymentLog: {
          id: row.id,
          amount: Number(row.amount),
          transactionId: row.transaction_id,
          status: row.status,
        },
      };
    } catch (queryError) {
      console.error('[Tumizi Subscription Status] Query error:', queryError);
      return {
        status: paymentLog.status ?? 'pending',
        subscriptionType: undefined,
        tumiziResult: null,
        paymentLog: {
          id: paymentLog.id,
          amount: Number(paymentLog.amount),
          transactionId: paymentLog.transaction_id,
          status: paymentLog.status,
        },
        queryError: 'Failed to query Tumizi payment status',
      };
    }
  }

  return {
    status: paymentLog.status ?? 'pending',
    subscriptionType: undefined,
    tumiziResult: null,
    paymentLog: {
      id: paymentLog.id,
      amount: Number(paymentLog.amount),
      transactionId: paymentLog.transaction_id,
      status: paymentLog.status,
    },
  };
}
