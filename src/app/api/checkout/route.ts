/**
 * Checkout API Route
 * 
 * POST: Create order from cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { checkoutSchema } from '@/lib/orders/validation';
import { generateOrderNumber, calculateOrderTotal } from '@/lib/orders/utils';
import { getCart, clearCart, generateCartId } from '@/lib/orders/cart';
import { sendOrderPlacedEmail, sendNewOrderAlertEmail } from '@/lib/orders/emails';

/**
 * POST /api/checkout - Create order from cart
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const body = await request.json();
    
    const validatedData = checkoutSchema.parse(body);

    // Get cart items (for now, we'll use the items from the request)
    // In production, you might want to fetch from cart storage
    const cartItems = validatedData.items;

    // Validate all items exist and have sufficient stock
    const orderItems = [];
    let totalAmount = 0;

    for (const item of cartItems) {
      const product = await prisma.products.findFirst({
        where: {
          id: item.product_id,
          tenant_id: tenant.id,
        },
        select: {
          id: true,
          name: true,
          price: true,
          sale_price: true,
          stock_quantity: true,
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.product_id} not found` },
          { status: 404 }
        );
      }

      let variant = null;
      let finalPrice = Number(product.sale_price || product.price);
      let stockQuantity = product.stock_quantity;

      if (item.variant_id) {
        variant = await prisma.product_variants.findFirst({
          where: {
            id: item.variant_id,
            product_id: item.product_id,
            tenant_id: tenant.id,
          },
          select: {
            id: true,
            price: true,
            stock_quantity: true,
          },
        });

        if (!variant) {
          return NextResponse.json(
            { error: `Variant ${item.variant_id} not found` },
            { status: 404 }
          );
        }

        finalPrice = variant.price ? Number(variant.price) : finalPrice;
        stockQuantity = variant.stock_quantity;
      }

      // Check stock availability
      if (stockQuantity !== null && stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Available: ${stockQuantity}` },
          { status: 400 }
        );
      }

      const itemTotal = finalPrice * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product_id: product.id,
        variant_id: variant?.id || null,
        quantity: item.quantity,
        price: finalPrice,
        total: itemTotal,
      });
    }

    // Apply coupon discount if provided (placeholder - implement coupon logic later)
    let couponDiscounted = null;
    if (validatedData.coupon_code) {
      // TODO: Implement coupon validation and discount calculation
      // For now, we'll skip coupon logic
    }

    // Generate order number
    let orderNumber = generateOrderNumber();
    
    // Ensure order number is unique
    let existingOrder = await prisma.orders.findUnique({
      where: { order_number: orderNumber },
    });
    
    while (existingOrder) {
      orderNumber = generateOrderNumber();
      existingOrder = await prisma.orders.findUnique({
        where: { order_number: orderNumber },
      });
    }

    // Create order
    const order = await prisma.orders.create({
      data: {
        tenant_id: tenant.id,
        order_number: orderNumber,
        user_id: user.id,
        name: validatedData.shipping_address.name,
        email: validatedData.shipping_address.email,
        phone: validatedData.shipping_address.phone,
        total_amount: totalAmount - (couponDiscounted || 0),
        status: 'pending',
        payment_status: validatedData.payment_method === 'cash_on_delivery' ? 'pending' : 'pending',
        payment_gateway: validatedData.payment_method,
        shipping_address: validatedData.shipping_address as any,
        billing_address: (validatedData.billing_address || validatedData.shipping_address) as any,
        coupon: validatedData.coupon_code || null,
        coupon_discounted: couponDiscounted,
        message: validatedData.notes || null,
        order_products: {
          create: orderItems.map((item) => ({
            tenant_id: tenant.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            user_id: user.id,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
          })),
        },
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

    // Update inventory (decrease stock)
    for (const item of orderItems) {
      if (item.variant_id) {
        // Update variant stock
        await prisma.product_variants.update({
          where: { id: item.variant_id },
          data: {
            stock_quantity: {
              decrement: item.quantity,
            },
          },
        });
      } else {
        // Update product stock
        await prisma.products.update({
          where: { id: item.product_id },
          data: {
            stock_quantity: {
              decrement: item.quantity,
            },
          },
        });
      }
    }

    // Clear cart
    const cartId = generateCartId(user.id);
    clearCart(cartId);

    // Send email notifications (async, don't wait)
    Promise.all([
      sendOrderPlacedEmail({
        order,
        tenant,
        customerEmail: validatedData.shipping_address.email,
        customerName: validatedData.shipping_address.name,
      }),
      sendNewOrderAlertEmail({
        order,
        tenant,
      }),
      // Send immediate notification email for new orders
      (async () => {
        const { sendImmediateNotificationEmail } = await import('@/lib/notifications/email');
        await sendImmediateNotificationEmail({
          tenant,
          notification: {
            id: `order-${order.id}`,
            type: 'new_order',
            title: 'New Order',
            message: `Order ${order.order_number} - $${Number(order.total_amount).toFixed(2)}`,
            link: `/dashboard/orders/${order.id}`,
            created_at: order.created_at || new Date(),
            read: false,
            metadata: {
              order_id: order.id,
              order_number: order.order_number,
              amount: Number(order.total_amount),
            },
          },
        }).catch((error) => {
          console.error('Error sending notification email:', error);
        });
      })(),
    ]).catch((error) => {
      console.error('Error sending order emails:', error);
      // Don't fail the order creation if emails fail
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        total_amount: Number(order.total_amount),
        status: order.status,
        payment_status: order.payment_status,
        created_at: order.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error during checkout:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to process checkout' },
      { status: error.status || 500 }
    );
  }
}

