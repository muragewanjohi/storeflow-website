import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { syncTumiziOrderPaymentByOrderId } from '@/lib/tumizi/sync-order-payment';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * GET /api/v1/mobile/dashboard/orders/:id/tumizi/sync-payment
 * Poll Tumizi and update order payment_status (Tumizi orders only).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const orderLookup = {
    tenant_id: gate.ctx.tenantId,
    ...(isUuid(id) ? { id } : { order_number: id }),
  };

  try {
    const order = await prisma.orders.findFirst({
      where: orderLookup,
      select: {
        id: true,
        payment_gateway: true,
        payment_status: true,
      },
    });

    if (!order) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Order not found'), { status: 404 });
    }

    if (order.payment_gateway !== 'tumizi') {
      return NextResponse.json(
        mobileError('VALIDATION_ERROR', 'Order is not a Tumizi payment'),
        { status: 400 },
      );
    }

    const result = await syncTumiziOrderPaymentByOrderId(order.id, gate.ctx.tenantId);

    return NextResponse.json(
      mobileSuccess({
        synced: result.synced,
        paymentStatus: result.payment_status ?? order.payment_status,
        tumiziStatus: result.tumizi_status,
        reason: result.reason,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error('[Mobile Tumizi sync-payment]', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to sync Tumizi payment status'),
      { status: 500 },
    );
  }
}
