/**
 * POST /api/admin/payments/test-mpesa
 * 
 * Initiates a test M-Pesa STK Push payment
 * Used by landlord admin to test Mpesa integration
 * 
 * Flow:
 * 1. Validates phone number and amount
 * 2. Creates payment log entry (without tenant association for test)
 * 3. Initiates STK Push via M-Pesa API
 * 4. Returns checkout request ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { getMpesaService } from '@/lib/mpesa/mpesa-service';

const testPaymentSchema = z.object({
  phone_number: z.string().regex(/^(?:254|0)[0-9]{9}$/, {
    message: 'Invalid phone number format. Use 254XXXXXXXXX or 0XXXXXXXXX',
  }),
  amount: z.number().positive('Amount must be greater than 0'),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthOrRedirect('/admin/login');
    await requireRoleOrRedirect(user, 'landlord', '/admin/login');

    const body = await request.json();
    const { phone_number, amount } = testPaymentSchema.parse(body);

    // Round amount (M-Pesa requires whole numbers, no decimals)
    const roundedAmount = Math.round(amount);

    if (roundedAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Generate unique reference for test payment
    const accountReference = `TEST-${Date.now()}`;

    // Get a default tenant for test payments (or use first available tenant)
    // For test payments, we'll use the first active tenant or create a test entry
    const defaultTenant = await prisma.tenants.findFirst({
      where: {
        status: 'active',
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!defaultTenant) {
      return NextResponse.json(
        { error: 'No active tenant found. Please create a tenant first.' },
        { status: 400 }
      );
    }

    // Create payment log entry
    const paymentLog = await prisma.payment_logs.create({
      data: {
        tenant_id: defaultTenant.id,
        user_id: user.id,
        gateway: 'mpesa_buy_goods',
        amount: roundedAmount,
        currency: 'KES',
        status: 'pending',
        metadata: {
          phone_number,
          account_reference: accountReference,
          is_test_payment: true,
          initiated_by: user.email,
        },
      },
    });

    // Get M-Pesa service
    const mpesaService = getMpesaService();

    // Get callback URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                   request.headers.get('origin') || 
                   'https://yourdomain.com';
    const callbackUrl = `${baseUrl}/api/mpesa/subscription/callback`;

    // Initiate STK Push
    const stkResponse = await mpesaService.initiateStkPush({
      phoneNumber: phone_number,
      amount: roundedAmount,
      accountReference,
      transactionDesc: `Test Payment: ${accountReference}`,
      callbackUrl,
    });

    // Update payment log with M-Pesa request IDs
    await prisma.payment_logs.update({
      where: { id: paymentLog.id },
      data: {
        payment_id: stkResponse.checkoutRequestID,
        metadata: {
          ...(paymentLog.metadata as any),
          merchant_request_id: stkResponse.merchantRequestID,
          checkout_request_id: stkResponse.checkoutRequestID,
          response_code: stkResponse.responseCode,
          response_description: stkResponse.responseDescription,
          customer_message: stkResponse.customerMessage,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: stkResponse.customerMessage || 'Payment request sent. Please check your phone.',
      checkout_request_id: stkResponse.checkoutRequestID,
      merchant_request_id: stkResponse.merchantRequestID,
      payment_log_id: paymentLog.id,
    });
  } catch (error) {
    console.error('[Test Mpesa Payment] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // Check if it's an M-Pesa API error
      if (error.message.includes('M-Pesa') || error.message.includes('STK Push')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to initiate test payment')
          : 'Failed to initiate test payment. Please check your M-Pesa configuration.',
      },
      { status: 500 }
    );
  }
}
