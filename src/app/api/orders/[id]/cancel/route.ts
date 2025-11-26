/**
 * Order Cancellation API Route
 * 
 * POST: Cancel an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { cancelOrderSchema } from '@/lib/orders/validation';
import { sendOrderCancelledEmail } from '@/lib/orders/emails';

/**
 * POST /api/orders/[id]/cancel - Cancel an order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;
    const body = await request.json();

    const { reason, refund, notes } = cancelOrderSchema.parse(body);

    // Fetch order with items
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
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if order can be cancelled
    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'Order is already cancelled' }, { status: 400 });
    }

    if (order.status === 'delivered') {
      return NextResponse.json({ error: 'Cannot cancel a delivered order' }, { status: 400 });
    }

    if (order.status === 'refunded') {
      return NextResponse.json({ error: 'Order has already been refunded' }, { status: 400 });
    }

    // Restore inventory (increase stock)
    // Track which products have variants so we can sync product-level stock
    const productsWithVariants = new Set<string>();
    
    for (const item of order.order_products) {
      if (item.variant_id) {
        // Restore variant stock
        await prisma.product_variants.update({
          where: { id: item.variant_id },
          data: {
            stock_quantity: {
              increment: item.quantity,
            },
          },
        });
        if (item.product_id) {
          productsWithVariants.add(item.product_id);
        }
      } else if (item.product_id) {
        // Restore product stock (only when no variants exist)
        await prisma.products.update({
          where: { id: item.product_id },
          data: {
            stock_quantity: {
              increment: item.quantity,
            },
          },
        });
      }
    }

    // Sync product-level stock for products with variants
    const { syncProductStockFromVariants } = await import('@/lib/inventory/sync-product-stock');
    for (const productId of productsWithVariants) {
      await syncProductStockFromVariants(productId, tenant.id);
    }

    // Update order status
    const updatedOrder = await prisma.orders.update({
      where: { id },
      data: {
        status: 'cancelled',
        payment_status: refund ? 'refunded' : order.payment_status,
        message: notes || order.message,
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

    // Send cancellation email (async)
    // Only include refund information if payment was actually made
    const wasPaymentMade = order.payment_status === 'paid';
    sendOrderCancelledEmail({
      order: updatedOrder as any,
      tenant,
      reason,
      refundAmount: refund && wasPaymentMade ? Number(order.total_amount) : undefined,
    }).catch((error) => {
      console.error('Error sending cancellation email:', error);
      // Don't fail the cancellation if email fails
    });

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        order_number: updatedOrder.order_number,
        status: updatedOrder.status,
        payment_status: updatedOrder.payment_status,
        updated_at: updatedOrder.updated_at,
      },
      message: 'Order cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to cancel order' },
      { status: error.status || 500 }
    );
  }
}

