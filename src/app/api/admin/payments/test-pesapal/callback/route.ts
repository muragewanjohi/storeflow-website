/**
 * GET /api/admin/payments/test-pesapal/callback
 *
 * PesaPal redirects the user here after a test payment. We verify status
 * via GetTransactionStatus, update the payment_log, then redirect to admin payments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import {
  getTransactionStatus,
  isTransactionCompleted,
} from '@/lib/pesapal/pesapal-service';

export const dynamic = 'force-dynamic';

const adminPaymentsPath = '/admin/payments';

function redirectUrl(
  request: NextRequest,
  path: string,
  params: Record<string, string>
): string {
  const base = request.nextUrl.origin;
  const search = new URLSearchParams(params).toString();
  return `${base}${path}${search ? `?${search}` : ''}`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderTrackingId = searchParams.get('OrderTrackingId');
  const orderMerchantReference = searchParams.get('OrderMerchantReference');

  if (!orderTrackingId || !orderMerchantReference) {
    return NextResponse.redirect(
      redirectUrl(request, adminPaymentsPath, { pesapal: 'missing_params' })
    );
  }

  try {
    const statusResult = await getTransactionStatus(orderTrackingId);

    if (!isTransactionCompleted(statusResult)) {
      const reason =
        statusResult.payment_status_description?.toLowerCase() ?? 'failed';
      return NextResponse.redirect(
        redirectUrl(request, adminPaymentsPath, {
          pesapal: 'error',
          reason,
        })
      );
    }

    const paymentLog = await prisma.payment_logs.findFirst({
      where: {
        id: orderMerchantReference,
        gateway: 'pesapal',
      },
    });

    if (!paymentLog) {
      return NextResponse.redirect(
        redirectUrl(request, adminPaymentsPath, { pesapal: 'not_found' })
      );
    }

    if (paymentLog.status === 'completed') {
      return NextResponse.redirect(
        redirectUrl(request, adminPaymentsPath, { pesapal: 'success' })
      );
    }

    await prisma.payment_logs.update({
      where: { id: paymentLog.id },
      data: {
        status: 'completed',
        payment_id: orderTrackingId,
        transaction_id:
          statusResult.confirmation_code ?? orderTrackingId,
        metadata: {
          ...((paymentLog.metadata as Record<string, unknown>) ?? {}),
          payment_status_description: statusResult.payment_status_description,
          payment_method: statusResult.payment_method,
          completed_at: new Date().toISOString(),
        },
      },
    });

    return NextResponse.redirect(
      redirectUrl(request, adminPaymentsPath, { pesapal: 'success' })
    );
  } catch (error) {
    console.error('[Test PesaPal Callback] Error:', error);
    return NextResponse.redirect(
      redirectUrl(request, adminPaymentsPath, {
        pesapal: 'error',
        reason: 'callback_failed',
      })
    );
  }
}
