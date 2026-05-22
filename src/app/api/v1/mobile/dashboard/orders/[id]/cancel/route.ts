import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { CancelOrderError, cancelTenantOrder } from '@/lib/orders/cancel-order';
import { cancelOrderSchema } from '@/lib/orders/validation';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * POST /api/v1/mobile/dashboard/orders/:id/cancel
 * Cancel an order (UUID or order_number). Restores inventory; optional refund flag.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const { id: idParam } = await params;

  try {
    const body = cancelOrderSchema.parse(await request.json());

    let orderId = idParam;
    if (!isUuid(idParam)) {
      const byNumber = await prisma.orders.findFirst({
        where: { tenant_id: gate.ctx.tenantId, order_number: idParam },
        select: { id: true },
      });
      if (!byNumber) {
        return NextResponse.json(mobileError('NOT_FOUND', 'Order not found'), { status: 404 });
      }
      orderId = byNumber.id;
    }

    const result = await cancelTenantOrder({
      tenantId: gate.ctx.tenantId,
      orderId,
      reason: body.reason,
      refund: body.refund,
      notes: body.notes,
      userId: gate.ctx.user.id,
    });

    return NextResponse.json(
      mobileSuccess({
        order: {
          id: result.id,
          orderNumber: result.order_number,
          status: result.status,
          paymentStatus: result.payment_status,
          updatedAt: result.updated_at?.toISOString() ?? null,
        },
        message: 'Order cancelled successfully',
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid cancellation payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    if (error instanceof CancelOrderError) {
      return NextResponse.json(mobileError('BAD_REQUEST', error.message), {
        status: error.status,
      });
    }

    console.error('[Mobile Order Cancel]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to cancel order'), {
      status: 500,
    });
  }
}
