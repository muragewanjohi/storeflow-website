/**
 * POST /api/pesapal/subscription/initiate
 *
 * Initiates PesaPal subscription payment (redirect user to PesaPal to pay).
 * Supports monthly or yearly billing with configurable yearly discount.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import {
  submitOrderRequest,
  type BillingAddress,
  type SubmitOrderParams,
} from '@/lib/pesapal/pesapal-service';
import { pesapalConfig, getYearlyPrice } from '@/lib/pesapal/config';
import {
  calculateUpgradeProration,
  getPlanChangeType,
} from '@/lib/subscriptions/proration';
import { getLocalizedPrice } from '@/lib/pricing/location';

const initiateSchema = z.object({
  plan_id: z.string().uuid('Invalid plan ID'),
  billing_interval: z.enum(['monthly', 'yearly']),
  enable_recurring: z.boolean().optional().default(false),
  embed: z.boolean().optional().default(false),
});

export const dynamic = 'force-dynamic';

function formatDateDDMMYYYY(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin']);

    const tenant = await requireTenant();

    if (user.tenant_id !== tenant.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { plan_id, billing_interval, enable_recurring, embed } = initiateSchema.parse(body);

    const plan = await prisma.price_plans.findUnique({
      where: { id: plan_id },
    });

    if (!plan || plan.status !== 'active') {
      return NextResponse.json(
        { error: 'Plan not found or inactive' },
        { status: 404 }
      );
    }

    const currentPlan = tenant.plan_id
      ? await prisma.price_plans.findUnique({
          where: { id: tenant.plan_id },
        })
      : null;

    const locationInfo = { isKenya: tenant.country === 'KE' };
    const tenantData = (tenant as { data?: { is_demo?: boolean; isDemo?: boolean } }).data;
    const isDemoStore = tenantData?.is_demo === true || tenantData?.isDemo === true;
    const monthlyPlanPrice = Number(plan.price);
    const monthlyPrice = locationInfo.isKenya
      ? getLocalizedPrice(plan.name, true, monthlyPlanPrice, isDemoStore)
      : monthlyPlanPrice;
    const currentPlanPrice = currentPlan
      ? locationInfo.isKenya
        ? getLocalizedPrice(currentPlan.name, true, Number(currentPlan.price), isDemoStore)
        : Number(currentPlan.price)
      : 0;
    const changeType = getPlanChangeType(currentPlanPrice, monthlyPrice);

    let amount: number;
    let monthsToAdd: number;

    if (billing_interval === 'yearly') {
      amount = getYearlyPrice(monthlyPrice);
      monthsToAdd = 12;
    } else {
      amount = monthlyPrice;
      monthsToAdd = 1;
    }

    // Proration for upgrades (mid-cycle)
    if (changeType === 'upgrade' && currentPlan && tenant.expire_date) {
      const now = new Date();
      const expireDate = new Date(tenant.expire_date);
      if (expireDate > now) {
        const tenantStartDate = (tenant as { start_date?: Date }).start_date ?? tenant.created_at;
        const newPlanPriceForProration = billing_interval === 'yearly' ? amount / 12 : amount;
        const proration = calculateUpgradeProration(
          currentPlanPrice,
          newPlanPriceForProration,
          expireDate,
          tenantStartDate
        );
        if (proration.proratedAmount > 0) {
          amount = proration.proratedAmount;
        }
      }
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid payment amount. Please contact support.' },
        { status: 400 }
      );
    }

    const notificationId = pesapalConfig.notificationId;
    if (!notificationId) {
      return NextResponse.json(
        {
          error:
            'PesaPal IPN is not configured. Please set PESAPAL_NOTIFICATION_ID after registering your IPN URL.',
        },
        { status: 500 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
    const callbackPath = embed
      ? '/api/pesapal/subscription/callback?embed=1'
      : '/api/pesapal/subscription/callback';
    const callbackUrl = `${appUrl}${callbackPath}`;
    const cancellationUrl = embed
      ? `${appUrl}/dashboard/subscription/pesapal-done?cancelled=1`
      : `${appUrl}/dashboard/subscription`;

    const paymentLog = await prisma.payment_logs.create({
      data: {
        tenant_id: tenant.id,
        user_id: user.id,
        gateway: 'pesapal',
        amount,
        currency: tenant.country === 'KE' ? 'KES' : 'USD',
        status: 'pending',
        metadata: {
          plan_id,
          plan_name: plan.name,
          billing_interval,
          months_to_add: monthsToAdd,
          tenant_id: tenant.id,
        },
      },
    });

    const merchantRef = paymentLog.id;
    const nameParts = (tenant.name || 'Customer').trim().split(/\s+/);
    const first_name = nameParts[0] ?? 'Customer';
    const last_name = nameParts.slice(1).join(' ') || first_name;

    const billing_address: BillingAddress = {
      email_address: user.email ?? tenant.contact_email ?? 'customer@example.com',
      country_code: tenant.country ?? 'KE',
      first_name,
      last_name,
      line_1: tenant.name ?? 'N/A',
    };

    const params: SubmitOrderParams = {
      id: merchantRef,
      currency: tenant.country === 'KE' ? 'KES' : 'USD',
      amount,
      description: `Subscription: ${plan.name} (${billing_interval})`,
      callback_url: callbackUrl,
      notification_id: notificationId,
      billing_address,
      cancellation_url: cancellationUrl,
      account_number: tenant.id,
    };

    if (enable_recurring && billing_interval) {
      const start = new Date();
      const end = new Date(start);
      end.setMonth(end.getMonth() + monthsToAdd);
      params.subscription_details = {
        start_date: formatDateDDMMYYYY(start),
        end_date: formatDateDDMMYYYY(end),
        frequency: billing_interval === 'yearly' ? 'YEARLY' : 'MONTHLY',
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

    return NextResponse.json({
      redirect_url: result.redirect_url,
      payment_log_id: paymentLog.id,
      order_tracking_id: result.order_tracking_id,
      amount,
      currency: tenant.country === 'KE' ? 'KES' : 'USD',
    });
  } catch (error) {
    console.error('[PesaPal Initiate] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : 'Failed to initiate payment. Please try again or contact support.',
      },
      { status: 500 }
    );
  }
}
