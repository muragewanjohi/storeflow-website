/**
 * POST /api/mpesa/subscription/callback
 * 
 * M-Pesa callback endpoint for subscription payments
 * This endpoint receives payment confirmations from M-Pesa
 * 
 * IMPORTANT: Always return 200 OK to M-Pesa to prevent retries
 * Process payment asynchronously if needed
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import {
  sendSubscriptionActivatedEmail,
  sendPlanUpgradeConfirmationEmail,
} from '@/lib/subscriptions/emails';
import {
  calculateUpgradeProration,
  getPlanChangeType,
} from '@/lib/subscriptions/proration';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let callbackProcessed = false;

  try {
    const body = await request.json();
    
    // M-Pesa callback structure
    const stkCallback = body.Body?.stkCallback;
    
    if (!stkCallback) {
      console.error('[Mpesa Callback] Invalid callback format:', JSON.stringify(body));
      // Return 200 to prevent M-Pesa retries
      return NextResponse.json({ 
        success: false,
        error: 'Invalid callback format' 
      });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    console.log('[Mpesa Callback] Received callback:', {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
    });

    // Find payment log by checkout request ID
    const paymentLog = await prisma.payment_logs.findFirst({
      where: {
        payment_id: CheckoutRequestID,
        gateway: 'mpesa_buy_goods',
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
      console.error(`[Mpesa Callback] Payment log not found for CheckoutRequestID: ${CheckoutRequestID}`);
      // Return 200 to prevent M-Pesa retries
      return NextResponse.json({ 
        success: false,
        error: 'Payment not found' 
      });
    }

    const tenant = paymentLog.tenants;
    const metadata = paymentLog.metadata as any;

    // Check payment result
    // ResultCode: 0 = success, 1032 = cancelled, 1037 = timeout, others = failed
    if (ResultCode !== 0) {
      // Payment failed, cancelled, or timed out
      const statusMap: Record<number, string> = {
        1032: 'cancelled',
        1037: 'timeout',
      };
      
      const newStatus = statusMap[ResultCode] || 'failed';
      
      await prisma.payment_logs.update({
        where: { id: paymentLog.id },
        data: {
          status: newStatus,
          metadata: {
            ...metadata,
            result_code: ResultCode,
            result_desc: ResultDesc,
            callback_received_at: new Date().toISOString(),
          },
        },
      });

      console.log(`[Mpesa Callback] Payment ${newStatus}:`, {
        CheckoutRequestID,
        ResultCode,
        ResultDesc,
      });

      callbackProcessed = true;
      return NextResponse.json({
        success: true,
        message: 'Payment status updated',
      });
    }

    // Payment successful - extract transaction details
    const callbackItems = CallbackMetadata?.Item || [];
    const amount = callbackItems.find((item: any) => item.Name === 'Amount')?.Value;
    const mpesaReceiptNumber = callbackItems.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
    const transactionDate = callbackItems.find((item: any) => item.Name === 'TransactionDate')?.Value;
    const phoneNumber = callbackItems.find((item: any) => item.Name === 'PhoneNumber')?.Value;

    console.log('[Mpesa Callback] Payment successful:', {
      CheckoutRequestID,
      Amount: amount,
      ReceiptNumber: mpesaReceiptNumber,
    });

    // Verify amount matches
    if (amount !== Number(paymentLog.amount)) {
      console.error(`[Mpesa Callback] Amount mismatch: expected ${paymentLog.amount}, received ${amount}`);
      await prisma.payment_logs.update({
        where: { id: paymentLog.id },
        data: {
          status: 'failed',
          metadata: {
            ...metadata,
            error: 'Amount mismatch',
            received_amount: amount,
            expected_amount: Number(paymentLog.amount),
            callback_received_at: new Date().toISOString(),
          },
        },
      });
      
      callbackProcessed = true;
      return NextResponse.json({ 
        success: false,
        error: 'Amount mismatch' 
      });
    }

    // Check if payment was already processed (idempotency)
    if (paymentLog.status === 'completed') {
      console.log(`[Mpesa Callback] Payment already processed: ${CheckoutRequestID}`);
      callbackProcessed = true;
      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
      });
    }

    // Update payment log
    await prisma.payment_logs.update({
      where: { id: paymentLog.id },
      data: {
        status: 'completed',
        transaction_id: mpesaReceiptNumber,
        metadata: {
          ...metadata,
          mpesa_receipt_number: mpesaReceiptNumber,
          transaction_date: transactionDate,
          phone_number: phoneNumber,
          callback_received_at: new Date().toISOString(),
        },
      },
    });

    // Activate subscription
    const planId = metadata.plan_id;
    const plan = await prisma.price_plans.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      console.error(`[Mpesa Callback] Plan not found: ${planId}`);
      callbackProcessed = true;
      return NextResponse.json({ 
        success: false,
        error: 'Plan not found' 
      });
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

    // Calculate expiration date
    let newExpireDate: Date;
    if (currentPlan && tenant.expire_date && new Date(tenant.expire_date) > now) {
      // Extend from current expiration
      newExpireDate = new Date(tenant.expire_date);
      newExpireDate.setMonth(newExpireDate.getMonth() + plan.duration_months);
    } else {
      // New subscription
      newExpireDate = new Date(now);
      newExpireDate.setMonth(newExpireDate.getMonth() + plan.duration_months);
    }

    // Update tenant subscription
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

    // Log subscription change
    await prisma.subscription_changes.create({
      data: {
        tenant_id: tenant.id,
        from_plan_id: currentPlan?.id || null,
        to_plan_id: planId,
        change_type: currentPlan 
          ? (changeType === 'upgrade' ? 'upgrade' : 'activation') 
          : 'activation',
        effective_date: now,
        prorated_amount: metadata.prorated_amount || 0,
        status: 'completed',
        metadata: {
          payment_log_id: paymentLog.id,
          mpesa_receipt_number: mpesaReceiptNumber,
          payment_method: 'mpesa_buy_goods',
        },
      },
    });

    // Send confirmation email (don't await to avoid blocking callback)
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
        proratedAmount: metadata.prorated_amount || undefined,
      }).catch((error) => {
        console.error('[Mpesa Callback] Error sending upgrade email:', error);
      });
    } else {
      sendSubscriptionActivatedEmail({
        tenant: updatedTenant as any,
        plan: {
          name: plan.name,
          price: newPlanPrice,
          duration_months: plan.duration_months,
        },
        expireDate: newExpireDate,
      }).catch((error) => {
        console.error('[Mpesa Callback] Error sending activation email:', error);
      });
    }

    console.log(`[Mpesa Callback] Subscription activated successfully for tenant: ${tenant.id}`);
    callbackProcessed = true;

    return NextResponse.json({
      success: true,
      message: 'Payment processed and subscription activated',
    });
  } catch (error) {
    console.error('[Mpesa Callback] Error processing callback:', error);
    
    // Always return 200 to M-Pesa to prevent retries
    // Log error for manual investigation
    return NextResponse.json({
      success: false,
      error: 'Callback processing failed',
      // Only include error details in development
      ...(process.env.NODE_ENV === 'development' && error instanceof Error
        ? { details: error.message }
        : {}),
    });
  }
}
