/**
 * Customer Order Cancellation API Route
 * 
 * POST: Customer cancels their own order
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';
import { z } from 'zod';
import { sendOrderCancelledEmail } from '@/lib/orders/emails';

const cancelOrderSchema = z.object({
  reason: z.string().optional().nullable(),
});

/**
 * POST /api/customers/orders/[id]/cancel - Cancel order (customer)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenant();
    const { id } = await params;
    const body = await request.json();
    const validatedData = cancelOrderSchema.parse(body);

    // Get customer (optional - guest orders can also cancel via email)
    const customer = await getCurrentCustomer();

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

    // Verify customer matches (if authenticated)
    if (customer) {
      if (order.user_id && order.user_id !== customer.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
    } else {
      // For guest orders, verify email matches
      const emailFromRequest = body.email;
      if (emailFromRequest && order.email !== emailFromRequest) {
        return NextResponse.json(
          { error: 'Email does not match order' },
          { status: 403 }
        );
      }
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
        message: validatedData.reason 
          ? `${order.message || ''}\n\nCancellation reason: ${validatedData.reason}`.trim()
          : order.message,
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
    sendOrderCancelledEmail({
      order: updatedOrder as any,
      tenant,
      reason: validatedData.reason || undefined,
    }).catch((error) => {
      console.error('Error sending cancellation email:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      order: {
        id: updatedOrder.id,
        order_number: updatedOrder.order_number,
        status: updatedOrder.status,
      },
    });
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    if (error instanceof z.ZodError) {
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
