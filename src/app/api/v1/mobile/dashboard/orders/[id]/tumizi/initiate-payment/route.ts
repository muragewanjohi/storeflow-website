import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import { initiateTumiziCustomerPaymentForOrder } from '@/lib/tumizi/initiate-order-payment';

const requestSchema = z.object({
  phoneNumber: z.string().min(10).max(20).optional(),
  phone_number: z.string().min(10).max(20).optional(),
  amount: z.coerce.number().positive().optional(),
  narration: z.string().max(255).optional(),
});

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * POST /api/v1/mobile/dashboard/orders/:id/tumizi/initiate-payment
 * Resend Tumizi STK / initiate customer payment for an order.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  const { id } = await params;
  const orderLookup = {
    tenant_id: gate.ctx.tenantId,
    ...(isUuid(id) ? { id } : { order_number: id }),
  };

  try {
    const body = await request.json();
    const payload = requestSchema.parse(body);
    const phoneNumber = payload.phoneNumber ?? payload.phone_number;

    if (!phoneNumber) {
      return NextResponse.json(
        mobileError('VALIDATION_ERROR', 'phoneNumber is required', [
          { field: 'phoneNumber', message: 'A valid phone number is required' },
        ]),
        { status: 400 },
      );
    }

    const order = await prisma.orders.findFirst({ where: orderLookup });

    if (!order) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Order not found'), { status: 404 });
    }

    const amount = payload.amount ?? Number(order.total_amount);
    const { externalReference, accountReference, response } =
      await initiateTumiziCustomerPaymentForOrder({
        tenantId: gate.ctx.tenantId,
        tenantName: gate.ctx.tenant.name,
        order: {
          id: order.id,
          order_number: order.order_number,
          invoice_number: order.invoice_number,
          total_amount: amount,
          name: order.name,
          email: order.email,
        },
        phoneNumber,
        userId: gate.ctx.user.id,
        narration: payload.narration,
      });

    return NextResponse.json(
      mobileSuccess({
        orderId: order.id,
        externalReference,
        accountReference,
        response,
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid payload',
          error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        ),
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to initiate Tumizi payment';
    console.error('[Mobile Tumizi initiate-payment]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', message), { status: 500 });
  }
}
