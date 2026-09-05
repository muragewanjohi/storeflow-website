import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { getMpesaService } from '@/lib/mpesa/mpesa-service';

const initiateSchema = z.object({
  phoneNumber: z.string().regex(/^(?:254|0)[0-9]{9}$/, {
    message: 'Invalid phone number format. Use 254XXXXXXXXX or 0XXXXXXXXX',
  }),
  amount: z.coerce.number().positive('amount must be greater than 0'),
  reference: z.string().max(100).optional(),
  description: z.string().max(255).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only tenant users can initiate M-Pesa payments from mobile API'),
        { status: 403 },
      );
    }

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const body = await request.json();
    const validated = initiateSchema.parse(body);

    const callbackUrl =
      process.env.MPESA_CALLBACK_URL ||
      (process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/mpesa/subscription/callback`
        : 'https://dukanest.com/api/mpesa/subscription/callback');

    const accountReference =
      validated.reference || `MOBILE-${user.tenant_id.slice(0, 8).toUpperCase()}-${Date.now()}`;

    const paymentLog = await prisma.payment_logs.create({
      data: {
        tenant_id: user.tenant_id,
        user_id: user.id,
        gateway: 'mpesa_buy_goods',
        amount: validated.amount,
        currency: 'KES',
        status: 'pending',
        metadata: {
          source: 'mobile_api',
          phone_number: validated.phoneNumber,
          account_reference: accountReference,
          description: validated.description ?? 'Mobile payment',
        },
      },
    });

    const mpesaService = getMpesaService();
    const stkResponse = await mpesaService.initiateStkPush({
      phoneNumber: validated.phoneNumber,
      amount: validated.amount,
      accountReference,
      transactionDesc: validated.description ?? 'DukaNest mobile payment',
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
        },
      },
    });

    return NextResponse.json(
      mobileSuccess({
        message: stkResponse.customerMessage,
        checkoutRequestId: stkResponse.checkoutRequestID,
        merchantRequestId: stkResponse.merchantRequestID,
        paymentLogId: paymentLog.id,
        amount: validated.amount,
        currency: 'KES',
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid M-Pesa initiation payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes('Unauthorized mobile request')) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Missing or invalid bearer token'),
        { status: 401 },
      );
    }

    console.error('[Mobile M-Pesa Initiate] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to initiate M-Pesa payment'),
      { status: 500 },
    );
  }
}
