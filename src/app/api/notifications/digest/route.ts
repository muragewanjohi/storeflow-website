/**
 * Notification Digest API Route
 * 
 * POST: Send digest email with batched notifications
 * This can be called by a cron job or scheduled task
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { sendNotificationDigestEmail } from '@/lib/notifications/email';
import type { Notification } from '@/lib/notifications/types';

/**
 * POST /api/notifications/digest - Send digest email
 * 
 * This endpoint aggregates notifications and sends a digest email
 * Can be called by cron jobs or scheduled tasks
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    // Get notifications that should be in digest
    const notifications: Notification[] = [];

    // Get pending payment orders
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
      take: 20,
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

    // Get low stock alerts
    const threshold = 10;
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
        take: 20,
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
        take: 20,
      }),
    ]);

    const allLowStock = [
      ...lowStockProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        stock: p.stock_quantity || 0,
        isVariant: false,
      })),
      ...lowStockVariants.map((v: any) => ({
        id: v.id,
        name: `${v.products.name} (Variant)`,
        stock: v.stock_quantity || 0,
        isVariant: true,
      })),
    ]
      .sort((a: any, b: any) => (a.stock || 0) - (b.stock || 0))
      .slice(0, 20);

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

    // Send digest email
    const result = await sendNotificationDigestEmail({
      tenant,
      notifications,
    });

    if (result.skipped) {
      return NextResponse.json({
        success: true,
        message: 'Digest email skipped (rate limited or no notifications)',
        skipped: true,
      });
    }

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? 'Digest email sent successfully'
        : 'Failed to send digest email',
      error: result.error,
    });
  } catch (error: any) {
    console.error('Error sending digest email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send digest email' },
      { status: error.status || 500 }
    );
  }
}

