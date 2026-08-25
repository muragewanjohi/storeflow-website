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
import { getAiQuotaWarnings, formatAiQuotaWarning } from '@/lib/subscriptions/ai-quota-warnings';

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
      lowStockVariants,
      newSupportTickets,
      landlordTickets,
      landlordTicketMessages,
      landlordUserIds,
      approvedDeliveryFees,
      rejectedDeliveryFees,
      aiQuotaWarnings,
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

      // 2. Low stock products
      prisma.products.findMany({
        where: {
          tenant_id: tenant.id,
          status: 'active',
          stock_quantity: { lte: 10, gt: 0 },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          stock_quantity: true,
        },
        orderBy: { stock_quantity: 'asc' },
        take: 10,
      }),

      // 2b. Low stock variants
      prisma.product_variants.findMany({
        where: {
          tenant_id: tenant.id,
          stock_quantity: { lte: 10, gt: 0 },
        },
        select: {
          id: true,
          sku: true,
          stock_quantity: true,
          product_id: true,
        },
        orderBy: { stock_quantity: 'asc' },
        take: 10,
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
          user_id: true,
        },
        orderBy: { updated_at: 'desc' },
        take: 5,
      }),

      // 4b. Recent landlord ticket messages (replies from landlord in last 7 days)
      prisma.landlord_support_ticket_messages.findMany({
        where: {
          created_at: { gte: sevenDaysAgo },
          landlord_support_tickets: {
            tenant_id: tenant.id,
            status: { not: 'closed' },
          },
        },
        select: {
          id: true,
          ticket_id: true,
          user_id: true,
          message: true,
          created_at: true,
          landlord_support_tickets: {
            select: {
              id: true,
              subject: true,
              user_id: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),

      // 4c. Landlord user IDs (to distinguish landlord replies from tenant replies)
      prisma.landlord_users.findMany({
        select: { id: true },
      }),

      // 5. Recently approved delivery fee quotes (last 24 hours)
      prisma.orders.findMany({
        where: {
          tenant_id: tenant.id,
          delivery_fee_status: 'approved',
          updated_at: { gte: twentyFourHoursAgo },
        },
        select: {
          id: true,
          order_number: true,
          total_amount: true,
          delivery_fee_quote: true,
          updated_at: true,
        },
        orderBy: { updated_at: 'desc' },
        take: 10,
      }),

      // 6. Recently rejected delivery fee quotes (last 24 hours)
      prisma.orders.findMany({
        where: {
          tenant_id: tenant.id,
          delivery_fee_status: 'rejected',
          updated_at: { gte: twentyFourHoursAgo },
        },
        select: {
          id: true,
          order_number: true,
          total_amount: true,
          delivery_fee_quote: true,
          delivery_fee_notes: true,
          updated_at: true,
        },
        orderBy: { updated_at: 'desc' },
        take: 10,
      }),

      // 7. AI Phase 8.2 — real usage vs real plan quota, only entries at/above 80%
      getAiQuotaWarnings(tenant),
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

    // Process low stock products
    for (const product of lowStockProducts) {
      notifications.push({
        id: `low-stock-product-${product.id}`,
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${product.name}${product.sku ? ` (${product.sku})` : ''} - ${product.stock_quantity} units remaining`,
        link: `/dashboard/inventory`,
        created_at: new Date(),
        read: false,
        metadata: {
          product_id: product.id,
          stock_quantity: product.stock_quantity,
          item_type: 'product',
        },
      });
    }

    // Get product names for low stock variants
    const variantProductIds = lowStockVariants.map((v: any) => v.product_id).filter(Boolean);
    let variantProducts: Map<string, string> = new Map();
    if (variantProductIds.length > 0) {
      const products = await prisma.products.findMany({
        where: { id: { in: variantProductIds } },
        select: { id: true, name: true },
      });
      variantProducts = new Map(products.map((p: any) => [p.id, p.name]));
    }

    // Process low stock variants
    for (const variant of lowStockVariants) {
      const variantName = variant.sku || 'Variant';
      const productName = variantProducts.get(variant.product_id) || 'Unknown Product';
      notifications.push({
        id: `low-stock-variant-${variant.id}`,
        type: 'low_stock',
        title: 'Low Stock Alert (Variant)',
        message: `${productName} - ${variantName} - ${variant.stock_quantity} units remaining`,
        link: `/dashboard/inventory`,
        created_at: new Date(),
        read: false,
        metadata: {
          variant_id: variant.id,
          product_id: variant.product_id,
          stock_quantity: variant.stock_quantity,
          item_type: 'variant',
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

    // Process landlord ticket reply messages (only from landlord, not tenant's own messages)
    const landlordUserIdSet = new Set(landlordUserIds.map((u: { id: string }) => u.id));
    for (const msg of landlordTicketMessages) {
      if (!msg.user_id || !landlordUserIdSet.has(msg.user_id)) continue;

      const existingNotification = notifications.find(
        (n) => n.id === `landlord-reply-${msg.ticket_id}`
      );
      if (!existingNotification) {
        notifications.push({
          id: `landlord-reply-${msg.ticket_id}`,
          type: 'support_ticket_reply',
          title: 'New Reply from Platform',
          message: `${msg.landlord_support_tickets.subject} - New reply received`,
          link: `/dashboard/support/landlord-tickets/${msg.ticket_id}`,
          created_at: msg.created_at || new Date(),
          read: false,
          metadata: {
            ticket_id: msg.ticket_id,
            message_id: msg.id,
          },
        });
      }
    }

    // Process approved delivery fee quotes
    for (const order of approvedDeliveryFees) {
      notifications.push({
        id: `delivery-approved-${order.id}`,
        type: 'delivery_fee_approved',
        title: 'Delivery Fee Quote Approved',
        message: `Order ${order.order_number} - Customer approved delivery fee`,
        link: `/dashboard/orders/${order.id}`,
        created_at: order.updated_at || new Date(),
        read: false,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          delivery_fee_quote: order.delivery_fee_quote ? Number(order.delivery_fee_quote) : null,
        },
      });
    }

    // Process rejected delivery fee quotes
    for (const order of rejectedDeliveryFees) {
      notifications.push({
        id: `delivery-rejected-${order.id}`,
        type: 'delivery_fee_rejected',
        title: 'Delivery Fee Quote Rejected',
        message: `Order ${order.order_number} - Customer rejected delivery fee`,
        link: `/dashboard/orders/${order.id}`,
        created_at: order.updated_at || new Date(),
        read: false,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          delivery_fee_quote: order.delivery_fee_quote ? Number(order.delivery_fee_quote) : null,
          rejection_reason: order.delivery_fee_notes || null,
        },
      });
    }

    // Process AI quota warnings (AI Phase 8.2) — real usage vs real plan
    // quota, deterministic/templated, no AI call. Deliberately backdated to
    // the start of the month (not "now") — these are computed fresh on
    // every read with no real occurred-at time, and a low-urgency "you're
    // close to a quota" nudge should never outrank a same-day pending
    // payment or new order in the sort below just because it was computed
    // this instant.
    for (const warning of aiQuotaWarnings) {
      const { title, message } = formatAiQuotaWarning(warning);
      notifications.push({
        id: warning.id,
        type: warning.severity === 'reached' ? 'ai_quota_reached' : 'ai_quota_warning',
        title,
        message,
        link: '/dashboard/subscription',
        created_at: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        read: false,
        metadata: {
          limit_key: warning.limitKey,
          current: warning.current,
          limit: warning.limit,
          severity: warning.severity,
        },
      });
    }

    // Sort by date
    notifications.sort((a: any, b: any) => {
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
