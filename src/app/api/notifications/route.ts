/**
 * Notifications API Route
 * 
 * GET: Get aggregated notifications (orders, inventory, etc.)
 * Optimized for performance with caching and batched queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { cache } from '@/lib/cache/simple-cache';
import type { Notification } from '@/lib/notifications/types';

/**
 * GET /api/notifications - Get all notifications (cached for 30 seconds)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();
    
    // Check cache first
    const cacheKey = `${tenant.id}:notifications`;
    const cached = cache.get<{ notifications: Notification[]; unread_count: number }>(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        notifications: cached.notifications,
        unread_count: cached.unread_count,
        total: cached.notifications.length,
      });
    }

    const notifications: Notification[] = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Batch all queries together for performance
    const [
      pendingOrders,
      lowStockProducts,
      newSupportTickets,
      landlordTickets,
    ] = await Promise.all([
      // 1. Pending/processing orders (limit 10)
      prisma.orders.findMany({
        where: {
          tenant_id: tenant.id,
          status: { in: ['pending', 'processing'] },
        },
        select: {
          id: true,
          order_number: true,
          total_amount: true,
          created_at: true,
          payment_status: true,
        },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),

      // 2. Low stock products (simple products only, limit 5)
      prisma.products.findMany({
        where: {
          tenant_id: tenant.id,
          status: 'active',
          stock_quantity: { lte: 10, gt: 0 },
        },
        select: {
          id: true,
          name: true,
          stock_quantity: true,
        },
        orderBy: { stock_quantity: 'asc' },
        take: 5,
      }),

      // 3. New support tickets (open, last 7 days)
      prisma.support_tickets.findMany({
        where: {
          tenant_id: tenant.id,
          status: 'open',
          created_at: { gte: sevenDaysAgo },
        },
        select: {
          id: true,
          subject: true,
          priority: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),

      // 4. Landlord support tickets with updates
      prisma.landlord_support_tickets.findMany({
        where: {
          tenant_id: tenant.id,
          status: { not: 'closed' },
          updated_at: { gte: sevenDaysAgo },
        },
        select: {
          id: true,
          subject: true,
          status: true,
          updated_at: true,
        },
        orderBy: { updated_at: 'desc' },
        take: 5,
      }),
    ]);

    // Process pending orders
    for (const order of pendingOrders) {
      notifications.push({
        id: `order-${order.id}`,
        type: order.payment_status === 'pending' ? 'pending_payment' : 'new_order',
        title: order.payment_status === 'pending' ? 'Pending Payment' : 'New Order',
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

    // Process low stock
    for (const product of lowStockProducts) {
      notifications.push({
        id: `low-stock-${product.id}`,
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${product.name} - ${product.stock_quantity} units remaining`,
        link: `/dashboard/products/${product.id}`,
        created_at: new Date(),
        read: false,
        metadata: {
          product_id: product.id,
          stock_quantity: product.stock_quantity,
        },
      });
    }

    // Process support tickets
    for (const ticket of newSupportTickets) {
      notifications.push({
        id: `ticket-${ticket.id}`,
        type: 'new_support_ticket',
        title: 'New Support Ticket',
        message: ticket.subject || 'New support ticket received',
        link: `/dashboard/support/tickets/${ticket.id}`,
        created_at: ticket.created_at || new Date(),
        read: false,
        metadata: {
          ticket_id: ticket.id,
          priority: ticket.priority,
        },
      });
    }

    // Process landlord tickets
    for (const ticket of landlordTickets) {
      notifications.push({
        id: `landlord-${ticket.id}`,
        type: 'support_ticket_reply',
        title: 'Platform Ticket Update',
        message: `${ticket.subject} - Status: ${ticket.status}`,
        link: `/dashboard/support/landlord-tickets/${ticket.id}`,
        created_at: ticket.updated_at || new Date(),
        read: false,
        metadata: {
          ticket_id: ticket.id,
          status: ticket.status,
        },
      });
    }

    // Sort by date
    notifications.sort((a, b) => {
      const dateA = a.created_at instanceof Date ? a.created_at.getTime() : new Date(a.created_at).getTime();
      const dateB = b.created_at instanceof Date ? b.created_at.getTime() : new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    const result = {
      notifications: notifications.slice(0, 20),
      unread_count: notifications.length,
    };

    // Cache for 30 seconds
    cache.set(cacheKey, result, 30);

    return NextResponse.json({
      success: true,
      notifications: result.notifications,
      unread_count: result.unread_count,
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
