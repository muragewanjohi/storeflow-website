import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { initiateTumiziCustomerPaymentForOrder } from '@/lib/tumizi/initiate-order-payment';

const requestSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  amount: z.coerce.number().positive().optional(),
  narration: z.string().max(255).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin', 'tenant_staff']);
    const tenant = await requireTenant();
    const { id: orderId } = await params;
    const payload = requestSchema.parse(await request.json());

    const order = await prisma.orders.findFirst({
      where: { id: orderId, tenant_id: tenant.id },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const amount = payload.amount ?? Number(order.total_amount);
    const { externalReference, accountReference, response } =
      await initiateTumiziCustomerPaymentForOrder({
        tenantId: tenant.id,
        tenantName: tenant.name,
        order: {
          id: order.id,
          order_number: order.order_number,
          invoice_number: order.invoice_number,
          total_amount: amount,
          name: order.name,
          email: order.email,
        },
        phoneNumber: payload.phoneNumber,
        userId: user.id,
        narration: payload.narration,
      });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        externalReference,
        accountReference,
        response,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initiate Tumizi payment' },
      { status: error.status || 500 },
    );
  }
}
