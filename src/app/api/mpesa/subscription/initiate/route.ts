/**
 * POST /api/mpesa/subscription/initiate
 * 
 * Initiates M-Pesa STK Push for subscription payment
 * Uses Buy Goods (Till Number) transaction type
 * 
 * Flow:
 * 1. Validates plan and calculates amount (with proration for upgrades)
 * 2. Creates payment log entry
 * 3. Initiates STK Push via M-Pesa API
 * 4. Returns checkout request ID for status polling
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { getMpesaService } from '@/lib/mpesa/mpesa-service';
import {
  calculateUpgradeProration,
  getPlanChangeType,
} from '@/lib/subscriptions/proration';

const initiatePaymentSchema = z.object({
  plan_id: z.string().uuid('Invalid plan ID'),
  phone_number: z.string().regex(/^(?:254|0)[0-9]{9}$/, {
    message: 'Invalid phone number format. Use 254XXXXXXXXX or 0XXXXXXXXX',
  }),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin']);

    const tenant = await requireTenant();

    // Verify user belongs to tenant
    if (user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { plan_id, phone_number } = initiatePaymentSchema.parse(body);

    // Get plan details
    const plan = await prisma.price_plans.findUnique({
      where: { id: plan_id },
    });

    if (!plan || plan.status !== 'active') {
      return NextResponse.json(
        { error: 'Plan not found or inactive' },
        { status: 404 }
      );
    }

    // Get current plan for comparison
    const currentPlan = tenant.plan_id
      ? await prisma.price_plans.findUnique({
          where: { id: tenant.plan_id },
        })
      : null;

    // Calculate amount (handle proration if upgrading)
    const currentPlanPrice = currentPlan ? Number(currentPlan.price) : 0;
    const newPlanPrice = Number(plan.price);
    const changeType = getPlanChangeType(currentPlanPrice, newPlanPrice);

    let amount = newPlanPrice;
    let proratedAmount = 0;

    // If upgrading mid-cycle, calculate proration
    if (changeType === 'upgrade' && currentPlan && tenant.expire_date) {
      const now = new Date();
      const expireDate = new Date(tenant.expire_date);
      
      if (expireDate > now) {
        const tenantStartDate = (tenant as any).start_date || tenant.created_at;
        const proration = calculateUpgradeProration(
          currentPlanPrice,
          newPlanPrice,
          expireDate,
          tenantStartDate
        );
        proratedAmount = proration.proratedAmount;
        amount = proratedAmount;
      }
    }

    // Ensure amount is positive
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid payment amount. Please contact support.' },
        { status: 400 }
      );
    }

    // Generate unique reference
    const accountReference = `SUB-${tenant.id.slice(0, 8).toUpperCase()}-${Date.now()}`;

    // Create payment log entry
    const paymentLog = await prisma.payment_logs.create({
      data: {
        tenant_id: tenant.id,
        user_id: user.id,
        gateway: 'mpesa_buy_goods',
        amount: amount,
        currency: 'KES',
        status: 'pending',
        metadata: {
          plan_id,
          plan_name: plan.name,
          phone_number,
          account_reference: accountReference,
          prorated_amount: proratedAmount,
          is_upgrade: changeType === 'upgrade',
          is_new_subscription: !currentPlan,
          change_type: changeType,
        },
      },
    });

    // Get M-Pesa service
    const mpesaService = getMpesaService();

    // Get callback URL (use configured URL or fallback to dukanest.com)
    const callbackUrl = process.env.MPESA_CALLBACK_URL || 
                       (process.env.NEXT_PUBLIC_APP_URL 
                         ? `${process.env.NEXT_PUBLIC_APP_URL}/api/mpesa/subscription/callback`
                         : 'https://dukanest.com/api/mpesa/subscription/callback');

    // Initiate STK Push
    const stkResponse = await mpesaService.initiateStkPush({
      phoneNumber: phone_number,
      amount: amount,
      accountReference,
      transactionDesc: `Subscription: ${plan.name}`,
      callbackUrl,
    });

    // Update payment log with M-Pesa request IDs
    await prisma.payment_logs.update({
      where: { id: paymentLog.id },
      data: {
        payment_id: stkResponse.checkoutRequestID,
        transaction_id: stkResponse.merchantRequestID,
        metadata: {
          ...(paymentLog.metadata as any),
          checkout_request_id: stkResponse.checkoutRequestID,
          merchant_request_id: stkResponse.merchantRequestID,
          callback_url: callbackUrl,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: stkResponse.customerMessage,
      checkout_request_id: stkResponse.checkoutRequestID,
      payment_log_id: paymentLog.id,
      amount: amount,
      currency: 'KES',
    });
  } catch (error) {
    console.error('[Mpesa Subscription Initiate] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', errors: error.issues },
        { status: 400 }
      );
    }

    // Handle M-Pesa specific errors
    if (error instanceof Error) {
      if (error.message.includes('M-Pesa configuration')) {
        return NextResponse.json(
          { error: 'Payment service is not properly configured. Please contact support.' },
          { status: 500 }
        );
      }
      
      if (error.message.includes('phone number')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to initiate payment')
          : 'Failed to initiate payment. Please try again or contact support.',
      },
      { status: 500 }
    );
  }
}
