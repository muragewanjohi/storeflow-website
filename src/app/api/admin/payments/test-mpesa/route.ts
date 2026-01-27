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

    // Get M-Pesa service first to validate configuration
    const mpesaService = getMpesaService();
    
    // Log environment being used (for debugging)
    const environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    console.log(`[Test Mpesa Payment] Using environment: ${environment}`);
    console.log(`[Test Mpesa Payment] Base URL: ${environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'}`);

    // Get callback URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                   request.headers.get('origin') || 
                   'https://yourdomain.com';
    const callbackUrl = `${baseUrl}/api/mpesa/subscription/callback`;

    // Initiate STK Push FIRST (before creating payment log)
    // This way, if STK push fails, we don't create orphaned records
    let stkResponse;
    try {
      stkResponse = await mpesaService.initiateStkPush({
        phoneNumber: phone_number,
        amount: roundedAmount,
        accountReference,
        transactionDesc: `Test Payment: ${accountReference}`,
        callbackUrl,
      });
      
      console.log('[Test Mpesa Payment] STK Push initiated successfully:', {
        checkoutRequestID: stkResponse.checkoutRequestID,
        merchantRequestID: stkResponse.merchantRequestID,
        responseCode: stkResponse.responseCode,
        customerMessage: stkResponse.customerMessage,
      });
    } catch (stkError) {
      console.error('[Test Mpesa Payment] STK Push failed:', stkError);
      // Re-throw to be handled by outer catch block
      throw new Error(
        stkError instanceof Error 
          ? `Failed to initiate STK Push: ${stkError.message}` 
          : 'Failed to initiate STK Push. Please check your M-Pesa configuration and phone number.'
      );
    }

    // Only create payment log AFTER successful STK push initiation
    const paymentLog = await prisma.payment_logs.create({
      data: {
        tenant_id: defaultTenant.id,
        user_id: user.id,
        gateway: 'mpesa_buy_goods',
        amount: roundedAmount,
        currency: 'KES',
        status: 'pending',
        payment_id: stkResponse.checkoutRequestID,
        metadata: {
          phone_number,
          account_reference: accountReference,
          is_test_payment: true,
          initiated_by: user.email,
          merchant_request_id: stkResponse.merchantRequestID,
          checkout_request_id: stkResponse.checkoutRequestID,
          response_code: stkResponse.responseCode,
          response_description: stkResponse.responseDescription,
          customer_message: stkResponse.customerMessage,
          environment: environment,
          callback_url: callbackUrl,
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
