/**
 * Order Cancellation API Route
 *
 * POST: Cancel an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { CancelOrderError, cancelTenantOrder } from '@/lib/orders/cancel-order';
import { cancelOrderSchema } from '@/lib/orders/validation';

/**
 * POST /api/orders/[id]/cancel - Cancel an order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;
    const body = await request.json();

    const { reason, refund, notes } = cancelOrderSchema.parse(body);

    const result = await cancelTenantOrder({
      tenantId: tenant.id,
      orderId: id,
      reason,
      refund,
      notes,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      order: {
        id: result.id,
        order_number: result.order_number,
        status: result.status,
        payment_status: result.payment_status,
        updated_at: result.updated_at,
      },
      message: 'Order cancelled successfully',
    });
  } catch (error: unknown) {
    console.error('Error cancelling order:', error);

    if (error instanceof CancelOrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to cancel order';
    const status =
      error && typeof error === 'object' && 'status' in error && typeof error.status === 'number'
        ? error.status
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
