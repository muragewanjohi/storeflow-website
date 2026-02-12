/**
 * GET /api/mpesa/subscription/status?checkout_request_id=xxx
 * 
 * Query payment status for a subscription payment
 * Used for polling payment status from frontend
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { getMpesaService } from '@/lib/mpesa/mpesa-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    // Verify user belongs to tenant
    if (user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const checkoutRequestId = searchParams.get('checkout_request_id');

    if (!checkoutRequestId) {
      return NextResponse.json(
        { error: 'checkout_request_id is required' },
        { status: 400 }
      );
    }

    // Find payment log
    const paymentLog = await prisma.payment_logs.findFirst({
      where: {
        payment_id: checkoutRequestId,
        tenant_id: tenant.id,
        gateway: 'mpesa_buy_goods',
      },
    });

    if (!paymentLog) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // If already completed, return status immediately
    if (paymentLog.status === 'completed') {
      const meta = (paymentLog.metadata ?? {}) as Record<string, unknown>;
      return NextResponse.json({
        status: 'completed',
        subscription_type: (meta.subscription_type as string) || 'activation',
        payment_log: {
          id: paymentLog.id,
          amount: paymentLog.amount,
          transaction_id: paymentLog.transaction_id,
          status: paymentLog.status,
        },
      });
    }

    // Query M-Pesa for latest status (only if still pending)
    if (paymentLog.status === 'pending') {
      try {
        const mpesaService = getMpesaService();
        const queryResult = await mpesaService.queryStkPushStatus(checkoutRequestId);

        // Update payment log if status changed
        if (queryResult.ResultCode === '0') {
          // Payment successful - callback should have been received, but update anyway
          await prisma.payment_logs.update({
            where: { id: paymentLog.id },
            data: {
              status: 'completed',
              metadata: {
                ...(paymentLog.metadata as any),
                query_result: queryResult,
                last_queried_at: new Date().toISOString(),
              },
            },
          });
        } else if (queryResult.ResultCode !== '0') {
          // Payment failed or pending
          const statusMap: Record<string, string> = {
            '1032': 'cancelled',
            '1037': 'timeout',
            '1': 'failed',
          };
          
          const newStatus = statusMap[queryResult.ResultCode] || 'pending';
          
          if (paymentLog.status !== newStatus) {
            await prisma.payment_logs.update({
              where: { id: paymentLog.id },
              data: {
                status: newStatus,
                metadata: {
                  ...(paymentLog.metadata as any),
                  query_result: queryResult,
                  last_queried_at: new Date().toISOString(),
                },
              },
            });
          }
        }

        // Refresh payment log after update
        const updatedPaymentLog = await prisma.payment_logs.findUnique({
          where: { id: paymentLog.id },
        });

        const meta = ((updatedPaymentLog ?? paymentLog).metadata ?? {}) as Record<string, unknown>;
        const subscriptionType = (meta.subscription_type as string) || 'activation';

        return NextResponse.json({
          status: updatedPaymentLog?.status || paymentLog.status,
          ...(updatedPaymentLog?.status === 'completed' && { subscription_type: subscriptionType }),
          mpesa_result: {
            result_code: queryResult.ResultCode,
            result_desc: queryResult.ResultDesc,
          },
          payment_log: {
            id: updatedPaymentLog?.id || paymentLog.id,
            amount: updatedPaymentLog?.amount || paymentLog.amount,
            transaction_id: updatedPaymentLog?.transaction_id || paymentLog.transaction_id,
            status: updatedPaymentLog?.status || paymentLog.status,
          },
        });
      } catch (queryError) {
        // If query fails, return current status from database
        console.error('[Mpesa Status Query] Error querying M-Pesa:', queryError);
        return NextResponse.json({
          status: paymentLog.status,
          error: 'Failed to query M-Pesa status',
          payment_log: {
            id: paymentLog.id,
            amount: paymentLog.amount,
            transaction_id: paymentLog.transaction_id,
            status: paymentLog.status,
          },
        });
      }
    }

    // Return current status
    return NextResponse.json({
      status: paymentLog.status,
      payment_log: {
        id: paymentLog.id,
        amount: paymentLog.amount,
        transaction_id: paymentLog.transaction_id,
        status: paymentLog.status,
      },
    });
  } catch (error) {
    console.error('[Mpesa Status Query] Error:', error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to query status')
          : 'Failed to query payment status',
      },
      { status: 500 }
    );
  }
}
