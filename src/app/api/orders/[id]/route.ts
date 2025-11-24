/**
 * Order Detail API Routes
 * 
 * GET: Get order details
 * PUT: Update order
 * DELETE: Delete order (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { orderStatusUpdateSchema, orderPaymentStatusUpdateSchema } from '@/lib/orders/validation';
import { isValidStatusTransition } from '@/lib/orders/utils';
import { sendOrderShippedEmail, sendOrderDeliveredEmail } from '@/lib/orders/emails';

/**
 * GET /api/orders/[id] - Get order details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;

    const order = await prisma.orders.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      include: {
        order_products: {
          include: {
            products: {
              select: {
                id: true,
                name: true,
                image: true,
                sku: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Fetch product variants separately if needed
    const variantIds = order.order_products
      .filter((item) => item.variant_id)
      .map((item) => item.variant_id) as string[];

    const variants = variantIds.length > 0
      ? await prisma.product_variants.findMany({
          where: {
            id: { in: variantIds },
            tenant_id: tenant.id,
          },
          select: {
            id: true,
            sku: true,
          },
        })
      : [];

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        name: order.name,
        email: order.email,
        phone: order.phone,
        total_amount: Number(order.total_amount),
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
          variant_sku: item.variant_id ? variantMap.get(item.variant_id)?.sku : null,
          quantity: item.quantity,
          price: Number(item.price),
          total: Number(item.total),
        })),
        created_at: order.created_at,
        updated_at: order.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order' },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/orders/[id] - Update order
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;
    const body = await request.json();

    // Check if order exists
    const existingOrder = await prisma.orders.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update order status if provided
    if (body.status) {
      const { status, notes } = orderStatusUpdateSchema.parse({ status: body.status, notes: body.notes });

      // Validate status transition
      if (!isValidStatusTransition(existingOrder.status || 'pending', status)) {
        return NextResponse.json(
          { error: `Invalid status transition from ${existingOrder.status} to ${status}` },
          { status: 400 }
        );
      }

      // Update order
      const order = await prisma.orders.update({
        where: { id },
        data: {
          status,
          message: notes || existingOrder.message,
        },
        include: {
          order_products: {
            include: {
              products: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      // Send email notifications based on status (async)
      if (status === 'shipped') {
        sendOrderShippedEmail({
          order: order as any,
          tenant,
          trackingNumber: body.tracking_number,
          shippingCarrier: body.shipping_carrier,
        }).catch((error) => {
          console.error('Error sending shipped email:', error);
        });
      } else if (status === 'delivered') {
        sendOrderDeliveredEmail({
          order: order as any,
          tenant,
        }).catch((error) => {
          console.error('Error sending delivered email:', error);
        });
      }

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          updated_at: order.updated_at,
        },
      });
    }

    // Update payment status if provided
    if (body.payment_status) {
      const { payment_status, transaction_id, payment_gateway, notes } = orderPaymentStatusUpdateSchema.parse({
        payment_status: body.payment_status,
        transaction_id: body.transaction_id,
        payment_gateway: body.payment_gateway,
        notes: body.notes,
      });

      const order = await prisma.orders.update({
        where: { id },
        data: {
          payment_status,
          transaction_id: transaction_id || existingOrder.transaction_id,
          payment_gateway: payment_gateway || existingOrder.payment_gateway,
          message: notes || existingOrder.message,
        },
      });

      // Send email notification for payment status changes (async)
      if (payment_status === 'failed' || (payment_status === 'pending' && existingOrder.payment_status !== 'pending')) {
        (async () => {
          const { sendImmediateNotificationEmail } = await import('@/lib/notifications/email');
          await sendImmediateNotificationEmail({
            tenant,
            notification: {
              id: `payment-${payment_status}-${order.id}`,
              type: payment_status === 'failed' ? 'failed_payment' : 'pending_payment',
              title: payment_status === 'failed' ? 'Failed Payment' : 'Pending Payment',
              message: payment_status === 'failed'
                ? `Payment failed for order ${order.order_number}`
                : `Order ${order.order_number} is awaiting payment`,
              link: `/dashboard/orders/${order.id}`,
              created_at: new Date(),
              read: false,
              metadata: {
                order_id: order.id,
                order_number: order.order_number,
              },
            },
          }).catch((error) => {
            console.error('Error sending payment notification email:', error);
          });
        })();
      }

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          order_number: order.order_number,
          payment_status: order.payment_status,
          updated_at: order.updated_at,
        },
      });
    }

    return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating order:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update order' },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/orders/[id] - Delete order (soft delete by updating status)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;

    const order = await prisma.orders.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Soft delete by cancelling the order
    await prisma.orders.update({
      where: { id },
      data: {
        status: 'cancelled',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete order' },
      { status: error.status || 500 }
    );
  }
}

