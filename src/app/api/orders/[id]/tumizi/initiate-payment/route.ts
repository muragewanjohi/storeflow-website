import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { tumiziClient } from '@/lib/tumizi/client';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';
import { buildTumiziAccountReference } from '@/lib/tumizi/references';

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

    const [order, tumiziConfig] = await Promise.all([
      prisma.orders.findFirst({
        where: { id: orderId, tenant_id: tenant.id },
      }),
      getTumiziTenantConfigByTenantId(tenant.id),
    ]);

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (!tumiziConfig?.enabled || !tumiziConfig.merchantExternalId) {
      return NextResponse.json(
        { success: false, error: 'Tumizi is not enabled for this store' },
        { status: 400 },
      );
    }

    const amount = payload.amount ?? Number(order.total_amount);
    const externalReference = `order-${order.id}-${Date.now()}`;
    const invoiceOrOrder = order.invoice_number || order.order_number;
    const accountReference = buildTumiziAccountReference(tenant.name, invoiceOrOrder);
    const response = await tumiziClient.createCustomerPayment({
      merchant_external_id: tumiziConfig.merchantExternalId,
      external_reference: externalReference,
      account_reference: accountReference,
      phone_number: payload.phoneNumber,
      amount,
      currency: 'KES',
      description: payload.narration || `Payment for order ${order.order_number}`,
      payer: {
        name: order.name || 'Store Customer',
        email: order.email || undefined,
        phone_number: payload.phoneNumber,
      },
    });

    const paymentReference =
      (response?.data as Record<string, unknown> | undefined)?.payment_reference ||
      response['payment_reference'];

    await prisma.payment_logs.create({
      data: {
        tenant_id: tenant.id,
        user_id: user.id,
        gateway: 'tumizi_customer_payment',
        amount,
        currency: 'KES',
        status: 'pending',
        payment_id: externalReference,
        transaction_id: typeof paymentReference === 'string' ? paymentReference : null,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          account_reference: accountReference,
          source: 'tumizi_order_payment',
          external_reference: externalReference,
          response,
        } as any,
      },
    });

    await prisma.orders.update({
      where: { id: order.id },
      data: {
        payment_gateway: 'tumizi',
        payment_track: externalReference,
        payment_status: 'pending',
      },
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
