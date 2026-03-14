import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { getMpesaService } from '@/lib/mpesa/mpesa-service';

const statusQuerySchema = z.object({
  checkoutRequestId: z.string().min(1, 'checkoutRequestId is required'),
});

const statusMap: Record<string, string> = {
  '0': 'completed',
  '1': 'failed',
  '1032': 'cancelled',
  '1037': 'timeout',
};

export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only tenant users can access M-Pesa status from mobile API'),
        { status: 403 },
      );
    }

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const { checkoutRequestId } = statusQuerySchema.parse({
      checkoutRequestId:
        searchParams.get('checkoutRequestId') ??
        searchParams.get('checkout_request_id') ??
        undefined,
    });

    const paymentLog = await prisma.payment_logs.findFirst({
      where: {
        tenant_id: user.tenant_id,
        gateway: 'mpesa_buy_goods',
        payment_id: checkoutRequestId,
      },
    });

    if (!paymentLog) {
      return NextResponse.json(
        mobileError('NOT_FOUND', 'Payment not found'),
        { status: 404 },
      );
    }

    let currentStatus = paymentLog.status ?? 'pending';
    let resultDesc: string | null = null;

    if (currentStatus === 'pending') {
      const mpesa = getMpesaService();
      const query = await mpesa.queryStkPushStatus(checkoutRequestId);
      resultDesc = query.ResultDesc;

      const mappedStatus = statusMap[query.ResultCode] ?? 'pending';
      if (mappedStatus !== currentStatus) {
        const updated = await prisma.payment_logs.update({
          where: { id: paymentLog.id },
          data: {
            status: mappedStatus,
            metadata: {
              ...(paymentLog.metadata as Record<string, unknown>),
              query_result_code: query.ResultCode,
              query_result_desc: query.ResultDesc,
              last_queried_at: new Date().toISOString(),
            },
          },
        });
        currentStatus = updated.status ?? mappedStatus;
      } else {
        currentStatus = mappedStatus;
      }
    }

    return NextResponse.json(
      mobileSuccess({
        checkoutRequestId,
        status: currentStatus,
        resultDescription: resultDesc,
        paymentLog: {
          id: paymentLog.id,
          amount: Number(paymentLog.amount),
          currency: paymentLog.currency ?? 'KES',
          transactionId: paymentLog.transaction_id,
          createdAt: paymentLog.created_at?.toISOString() ?? null,
          updatedAt: paymentLog.updated_at?.toISOString() ?? null,
        },
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid status query parameters',
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

    console.error('[Mobile M-Pesa Status] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch M-Pesa status'),
      { status: 500 },
    );
  }
}
