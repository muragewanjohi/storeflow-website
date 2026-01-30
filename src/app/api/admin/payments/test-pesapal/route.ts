/**
 * POST /api/admin/payments/test-pesapal
 *
 * Initiates a test PesaPal payment. Returns redirect_url so the user can
 * complete payment on PesaPal (card or M-Pesa). Used by landlord admin to test PesaPal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import {
  submitOrderRequest,
  type BillingAddress,
} from '@/lib/pesapal/pesapal-service';
import { pesapalConfig } from '@/lib/pesapal/config';

const testPaymentSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().length(3).optional().default('KES'),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthOrRedirect('/admin/login');
    await requireRoleOrRedirect(user, 'landlord', '/admin/login');

    const body = await request.json();
    const { amount, currency } = testPaymentSchema.parse(body);

    const roundedAmount = Math.round(amount * 100) / 100;
    if (roundedAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    const notificationId = pesapalConfig.notificationId;
    if (!notificationId) {
      return NextResponse.json(
        {
          error:
            'PesaPal IPN is not configured. Set PESAPAL_NOTIFICATION_ID after registering your IPN URL.',
        },
        { status: 400 }
      );
    }

    const defaultTenant = await prisma.tenants.findFirst({
      where: { status: 'active' },
      orderBy: { created_at: 'desc' },
    });

    if (!defaultTenant) {
      return NextResponse.json(
        { error: 'No active tenant found. Please create a tenant first.' },
        { status: 400 }
      );
    }

    const origin =
      request.nextUrl.origin ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://dukanest.com';
    const callbackUrl = `${origin}/api/admin/payments/test-pesapal/callback`;

    const paymentLog = await prisma.payment_logs.create({
      data: {
        tenant_id: defaultTenant.id,
        user_id: user.id,
        gateway: 'pesapal',
        amount: roundedAmount,
        currency,
        status: 'pending',
        metadata: {
          is_test_payment: true,
          initiated_by: user.email,
          description: `Test PesaPal payment - ${roundedAmount} ${currency}`,
        },
      },
    });

    const emailPart = user.email?.split('@')[0] ?? 'Admin';
    const billingAddress: BillingAddress = {
      email_address: user.email ?? 'admin@test.com',
      first_name: emailPart,
      last_name: 'Test',
      country_code: 'KE',
    };

    const result = await submitOrderRequest({
      id: paymentLog.id,
      currency,
      amount: roundedAmount,
      description: `Test payment - ${roundedAmount} ${currency}`,
      callback_url: callbackUrl,
      notification_id: notificationId,
      billing_address: billingAddress,
      cancellation_url: `${origin}/admin/payments?pesapal=cancelled`,
    });

    await prisma.payment_logs.update({
      where: { id: paymentLog.id },
      data: {
        payment_id: result.order_tracking_id,
        transaction_id: result.order_tracking_id,
        metadata: {
          ...((paymentLog.metadata as Record<string, unknown>) ?? {}),
          order_tracking_id: result.order_tracking_id,
          merchant_reference: result.merchant_reference,
        },
      },
    });

    return NextResponse.json({
      success: true,
      redirect_url: result.redirect_url,
      payment_log_id: paymentLog.id,
      order_tracking_id: result.order_tracking_id,
    });
  } catch (error) {
    console.error('[Test PesaPal Payment] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (
        error.message.includes('PesaPal') ||
        error.message.includes('PESAPAL')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : 'Failed to initiate test PesaPal payment. Check PesaPal configuration.',
      },
      { status: 500 }
    );
  }
}
