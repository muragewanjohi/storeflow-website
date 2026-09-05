/**
 * GET /api/dashboard/pos/sales/[id]/status
 *
 * Poll Tumizi for an M-Pesa POS order and return the current payment status.
 * Used by the web POS "waiting for M-Pesa" panel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requirePosDashboardStaff } from '@/lib/pos/dashboard-auth';
import { syncTumiziOrderPaymentByOrderId } from '@/lib/tumizi/sync-order-payment';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requirePosDashboardStaff();
  if (!gate.ok) return gate.response;

  const { id } = await params;

  try {
    const order = await prisma.orders.findFirst({
      where: { id, tenant_id: gate.tenant.id },
      select: { id: true, payment_gateway: true, payment_status: true },
    });
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 },
      );
    }

    if (order.payment_gateway !== 'tumizi') {
      return NextResponse.json({
        success: true,
        payment_status: order.payment_status ?? 'pending',
        synced: false,
      });
    }

    const result = await syncTumiziOrderPaymentByOrderId(order.id, gate.tenant.id);
    return NextResponse.json({
      success: true,
      payment_status: result.payment_status ?? order.payment_status ?? 'pending',
      synced: result.synced,
      tumizi_status: result.tumizi_status ?? null,
    });
  } catch (error) {
    console.error('[Dashboard POS sale status]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check payment status' },
      { status: 500 },
    );
  }
}
