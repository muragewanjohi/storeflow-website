/**
 * Notifications API Route
 * 
 * GET: Get aggregated notifications (orders, inventory, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import type { Notification } from '@/lib/notifications/types';

/**
 * GET /api/notifications - Get all notifications
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread_only') === 'true';

    const notifications: Notification[] = [];

    // 1. New orders (pending or processing status)
    const newOrders = await prisma.orders.findMany({
      where: {
        tenant_id: tenant.id,
        status: {
          in: ['pending', 'processing'],
        },
      },
      select: {
        id: true,
        order_number: true,
        total_amount: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 10,
    });

    for (const order of newOrders) {
      notifications.push({
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
      });
    }

    // 2. Orders with pending payment
    const pendingPaymentOrders = await prisma.orders.findMany({
      where: {
        tenant_id: tenant.id,
        payment_status: 'pending',
        status: {
          not: 'cancelled',
        },
      },
      select: {
        id: true,
        order_number: true,
        total_amount: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 10,
    });

    for (const order of pendingPaymentOrders) {
      notifications.push({
        id: `payment-pending-${order.id}`,
        type: 'pending_payment',
        title: 'Pending Payment',
        message: `Order ${order.order_number} is awaiting payment`,
        link: `/dashboard/orders/${order.id}`,
        created_at: order.created_at || new Date(),
        read: false,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
        },
      });
    }

    // 3. Orders with failed payment
    const failedPaymentOrders = await prisma.orders.findMany({
      where: {
        tenant_id: tenant.id,
        payment_status: 'failed',
        status: {
          not: 'cancelled',
        },
      },
      select: {
        id: true,
        order_number: true,
        total_amount: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 10,
    });

    for (const order of failedPaymentOrders) {
      notifications.push({
        id: `payment-failed-${order.id}`,
        type: 'failed_payment',
        title: 'Failed Payment',
        message: `Payment failed for order ${order.order_number}`,
        link: `/dashboard/orders/${order.id}`,
        created_at: order.created_at || new Date(),
        read: false,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
        },
      });
    }

    // 4. Low stock alerts
    const threshold = 10; // Default threshold
    const [lowStockProducts, lowStockVariants] = await Promise.all([
      prisma.products.findMany({
        where: {
          tenant_id: tenant.id,
          status: {
            in: ['active', 'draft'],
          },
          OR: [
            {
              stock_quantity: {
                lte: threshold,
              },
            },
            {
              stock_quantity: null,
            },
          ],
          product_variants: {
            none: {},
          },
        },
        select: {
          id: true,
          name: true,
          stock_quantity: true,
        },
        take: 10,
      }),
      prisma.product_variants.findMany({
        where: {
          tenant_id: tenant.id,
          stock_quantity: {
            lte: threshold,
          },
        },
        include: {
          products: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: 10,
      }),
    ]);

    // Add low stock notifications (limit to most critical)
    const allLowStock = [
      ...lowStockProducts.map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock_quantity || 0,
        isVariant: false,
      })),
      ...lowStockVariants.map((v) => ({
        id: v.id,
        name: `${v.products.name} (Variant)`,
        stock: v.stock_quantity,
        isVariant: true,
      })),
    ]
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10);

    for (const item of allLowStock) {
      notifications.push({
        id: `low-stock-${item.id}`,
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${item.name} - ${item.stock} units remaining`,
        link: item.isVariant
          ? `/dashboard/products?variant=${item.id}`
          : `/dashboard/products/${item.id}`,
        created_at: new Date(),
        read: false,
        metadata: {
          product_id: item.id,
          stock_quantity: item.stock,
        },
      });
    }

    // Sort all notifications by created_at (most recent first)
    notifications.sort((a, b) => {
      const dateA = a.created_at.getTime();
      const dateB = b.created_at.getTime();
      return dateB - dateA;
    });

    // Filter unread only if requested
    const filteredNotifications = unreadOnly
      ? notifications.filter((n) => !n.read)
      : notifications;

    // Get unread count
    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({
      success: true,
      notifications: filteredNotifications.slice(0, 20), // Limit to 20 most recent
      unread_count: unreadCount,
      total: notifications.length,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: error.status || 500 }
    );
  }
}

