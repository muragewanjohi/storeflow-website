import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { orderPaymentStatusUpdateSchema, orderStatusUpdateSchema } from '@/lib/orders/validation';
import { isValidStatusTransition } from '@/lib/orders/utils';
import {
  sendOrderDeliveredEmail,
  sendOrderShippedEmail,
  sendOrderStatusUpdateEmail,
  sendPaymentStatusUpdateEmail,
} from '@/lib/orders/emails';
import { dispatchNotificationToTenantDevices } from '@/lib/notifications/mobile-push';
import type { Tenant } from '@/lib/tenant-context';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;
  const { id } = await params;
  const orderLookup: Prisma.ordersWhereInput = {
    tenant_id: tenantId,
    ...(isUuid(id) ? { id } : { order_number: id }),
  };

  try {
    const order = await prisma.orders.findFirst({
      where: orderLookup,
      include: {
        order_products: {
          include: {
            products: {
              select: { id: true, name: true, image: true, sku: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Order not found'), { status: 404 });
    }

    const variantIds = order.order_products
      .filter((item) => item.variant_id)
      .map((item) => item.variant_id) as string[];

    const variants =
      variantIds.length > 0
        ? await prisma.product_variants.findMany({
            where: { id: { in: variantIds }, tenant_id: tenantId },
            select: { id: true, sku: true },
          })
        : [];

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    return NextResponse.json(
      mobileSuccess({
        order: {
          id: order.id,
          order_number: order.order_number,
          name: order.name,
          email: order.email,
          phone: order.phone,
          total_amount: Number(order.total_amount),
          // Basic deposit support (docs/SERVICES_PLAN.md) — null for every
          // normal order, real values only when a deposit was configured.
          deposit_amount: order.deposit_amount != null ? Number(order.deposit_amount) : null,
          balance_amount: order.balance_amount != null ? Number(order.balance_amount) : null,
          status: order.status,
          payment_status: order.payment_status,
          payment_gateway: order.payment_gateway,
          transaction_id: order.transaction_id,
          shipping_address: order.shipping_address,
          billing_address: order.billing_address,
          coupon: order.coupon,
          coupon_discounted: order.coupon_discounted ? Number(order.coupon_discounted) : null,
          message: order.message,
          items: order.order_products.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            product_name: item.products?.name || 'Unknown Product',
            product_image: item.products?.image,
            product_sku: item.products?.sku,
            variant_sku: item.variant_id ? variantMap.get(item.variant_id)?.sku ?? null : null,
            quantity: item.quantity,
            price: Number(item.price),
            total: Number(item.total),
          })),
          created_at: order.created_at,
          updated_at: order.updated_at,
        },
      }),
      { status: 200 },
    );
  } catch (e) {
    console.error('[Mobile order GET]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch order'), { status: 500 });
  }
}

/**
 * PATCH — same capabilities as web PUT /api/orders/[id] (status and/or payment_status).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenant, tenantId } = gate.ctx;

  const { id } = await params;
  const orderLookup: Prisma.ordersWhereInput = {
    tenant_id: tenantId,
    ...(isUuid(id) ? { id } : { order_number: id }),
  };

  try {
    const body = await request.json();
    const existingOrder = await prisma.orders.findFirst({
      where: orderLookup,
    });

    if (!existingOrder) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Order not found'), { status: 404 });
    }

    if (body.status) {
      if (existingOrder.delivery_fee_status === 'pending' || existingOrder.delivery_fee_status === 'quoted') {
        return NextResponse.json(
          mobileError(
            'BAD_REQUEST',
            'Order status cannot be updated until the customer approves the delivery fee quote',
          ),
          { status: 400 },
        );
      }

      if (existingOrder.delivery_fee_status === 'rejected' && body.status !== 'cancelled') {
        return NextResponse.json(
          mobileError(
            'BAD_REQUEST',
            'Order must be cancelled after the customer rejected the delivery fee.',
          ),
          { status: 400 },
        );
      }

      const { status, notes } = orderStatusUpdateSchema.parse({ status: body.status, notes: body.notes });

      if (!isValidStatusTransition(existingOrder.status || 'pending', status)) {
        return NextResponse.json(
          mobileError('BAD_REQUEST', `Invalid status transition from ${existingOrder.status} to ${status}`),
          { status: 400 },
        );
      }

      const orderDetails = (existingOrder.order_details as Record<string, unknown> | null) || {};
      if (body.tracking_number || body.shipping_carrier) {
        if (body.tracking_number) orderDetails.tracking_number = body.tracking_number;
        if (body.shipping_carrier) orderDetails.shipping_carrier = body.shipping_carrier;
      }

      const order = await prisma.orders.update({
        where: { id: existingOrder.id },
        data: {
          status,
          message: notes || existingOrder.message,
          ...(Object.keys(orderDetails).length > 0
            ? { order_details: orderDetails as unknown as Prisma.InputJsonValue }
            : {}),
        },
        include: {
          order_products: {
            include: {
              products: { select: { id: true, name: true, image: true } },
            },
          },
        },
      });

      if (status === 'shipped') {
        sendOrderShippedEmail({
          order: order as any,
          tenant: tenant as Tenant,
          trackingNumber: body.tracking_number,
          shippingCarrier: body.shipping_carrier,
          notes: notes || order.message || null,
        }).catch((err) => console.error('sendOrderShippedEmail', err));
      } else if (status === 'delivered') {
        sendOrderDeliveredEmail({
          order: order as any,
          tenant: tenant as Tenant,
        }).catch((err) => console.error('sendOrderDeliveredEmail', err));
      } else {
        sendOrderStatusUpdateEmail({
          order: order as any,
          tenant: tenant as Tenant,
          oldStatus: existingOrder.status,
          newStatus: status,
          notes: notes || undefined,
        }).catch((err) => console.error('sendOrderStatusUpdateEmail', err));
      }

      return NextResponse.json(
        mobileSuccess({
          order: {
            id: order.id,
            order_number: order.order_number,
            status: order.status,
            updated_at: order.updated_at,
          },
        }),
        { status: 200 },
      );
    }

    if (body.payment_status) {
      if (existingOrder.payment_gateway === 'tumizi') {
        return NextResponse.json(
          mobileError(
            'BAD_REQUEST',
            'Tumizi payment status is synced automatically from Tumizi. Refresh payment status instead of updating manually.',
          ),
          { status: 400 },
        );
      }

      if (existingOrder.delivery_fee_status === 'pending' || existingOrder.delivery_fee_status === 'quoted') {
        return NextResponse.json(
          mobileError(
            'BAD_REQUEST',
            'Payment status cannot be updated until the customer approves the delivery fee quote',
          ),
          { status: 400 },
        );
      }

      if (existingOrder.delivery_fee_status === 'rejected') {
        return NextResponse.json(
          mobileError(
            'BAD_REQUEST',
            'Payment status cannot be updated after the customer rejected the delivery fee.',
          ),
          { status: 400 },
        );
      }

      const { payment_status, transaction_id, payment_gateway, notes } = orderPaymentStatusUpdateSchema.parse({
        payment_status: body.payment_status,
        transaction_id: body.transaction_id,
        payment_gateway: body.payment_gateway,
        notes: body.notes,
      });

      const order = await prisma.orders.update({
        where: { id: existingOrder.id },
        data: {
          payment_status,
          transaction_id: transaction_id || existingOrder.transaction_id,
          payment_gateway: payment_gateway || existingOrder.payment_gateway,
          message: notes || existingOrder.message,
        },
        include: {
          order_products: {
            include: { products: { select: { id: true, name: true, image: true } } },
          },
        },
      });

      sendPaymentStatusUpdateEmail({
        order: order as any,
        tenant: tenant as Tenant,
        oldPaymentStatus: existingOrder.payment_status,
        newPaymentStatus: payment_status,
        notes: notes || undefined,
      }).catch((err) => console.error('sendPaymentStatusUpdateEmail', err));

      if (payment_status === 'failed' || (payment_status === 'pending' && existingOrder.payment_status !== 'pending')) {
        (async () => {
          const { sendImmediateNotificationEmail } = await import('@/lib/notifications/email');
          const notification = {
            id: `payment-${payment_status}-${order.id}`,
            type: (payment_status === 'failed' ? 'failed_payment' : 'pending_payment') as
              | 'failed_payment'
              | 'pending_payment',
            title: payment_status === 'failed' ? 'Failed Payment' : 'Pending Payment',
            message:
              payment_status === 'failed'
                ? `Payment failed for order ${order.order_number}`
                : `Order ${order.order_number} is awaiting payment`,
            link: `/dashboard/orders/${order.id}`,
            created_at: new Date(),
            read: false,
            metadata: { order_id: order.id, order_number: order.order_number },
          };

          await sendImmediateNotificationEmail({
            tenant: tenant as Tenant,
            notification,
          }).catch((err) => console.error('sendImmediateNotificationEmail', err));

          await dispatchNotificationToTenantDevices({
            tenantId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            link: notification.link,
          }).catch((err) => console.error('dispatchNotificationToTenantDevices', err));
        })();
      }

      return NextResponse.json(
        mobileSuccess({
          order: {
            id: order.id,
            order_number: order.order_number,
            payment_status: order.payment_status,
            updated_at: order.updated_at,
          },
        }),
        { status: 200 },
      );
    }

    return NextResponse.json(
      mobileError('VALIDATION_ERROR', 'No valid update fields', [
        { field: 'body', message: 'Provide status or payment_status' },
      ]),
      { status: 400 },
    );
  } catch (e: unknown) {
    console.error('[Mobile order PATCH]', e);
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Validation error',
          e.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        ),
        { status: 400 },
      );
    }
    const msg = e instanceof Error ? e.message : 'Failed to update order';
    return NextResponse.json(mobileError('INTERNAL_ERROR', msg), { status: 500 });
  }
}
