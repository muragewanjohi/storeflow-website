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

    // 4. New support tickets (open status, created in last 7 days)
    const newSupportTickets = await prisma.support_tickets.findMany({
      where: {
        tenant_id: tenant.id,
        status: 'open',
        created_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      select: {
        id: true,
        subject: true,
        priority: true,
        created_at: true,
        customers: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 10,
    });

    for (const ticket of newSupportTickets) {
      notifications.push({
        id: `ticket-new-${ticket.id}`,
        type: 'new_support_ticket',
        title: 'New Support Ticket',
        message: `${ticket.subject} - ${ticket.customers?.name || 'Customer'}`,
        link: `/dashboard/support/tickets/${ticket.id}`,
        created_at: ticket.created_at || new Date(),
        read: false,
        metadata: {
          ticket_id: ticket.id,
          priority: ticket.priority,
        },
      });
    }

    // 5. Support tickets with recent replies (messages in last 24 hours, from customers)
    // We need to check if the message is from a customer (not an admin)
    // A message is from a customer if its user_id matches the ticket's user_id (which is always a customer)
    // OR if the user_id exists in the customers table
    const recentTicketMessages = await prisma.support_ticket_messages.findMany({
      where: {
        tenant_id: tenant.id,
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
        user_id: {
          not: null, // Exclude null user_ids
        },
      },
      include: {
        support_tickets: {
          select: {
            id: true,
            subject: true,
            status: true,
            user_id: true,
            customers: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 20, // Get more to filter
    });

    // Check which messages are from customers by verifying user_id exists in customers table
    const customerIds = new Set<string>();
    if (recentTicketMessages.length > 0) {
      const userIds = recentTicketMessages
        .map((m) => m.user_id)
        .filter((id): id is string => id !== null);
      
      if (userIds.length > 0) {
        const customers = await prisma.customers.findMany({
          where: {
            tenant_id: tenant.id,
            id: {
              in: userIds,
            },
          },
          select: {
            id: true,
          },
        });
        customers.forEach((c) => customerIds.add(c.id));
      }
    }

    // Show notifications for replies from customers (admin wants to see customer replies)
    // Admin replies don't need notifications (admin is replying themselves)
    for (const message of recentTicketMessages) {
      if (!message.user_id) continue;
      
      const ticket = message.support_tickets;
      // A message is from a customer if:
      // 1. The message user_id matches the ticket's user_id (original customer), OR
      // 2. The message user_id exists in the customers table
      const isCustomerReply = 
        message.user_id === ticket.user_id || 
        customerIds.has(message.user_id);
      
      // Show notification for customer replies (admin needs to know when customers reply)
      if (isCustomerReply && ticket.status !== 'closed') {
        // Check if we already have a notification for this ticket
        const existingNotification = notifications.find(
          (n) => n.id === `ticket-reply-${message.ticket_id}`
        );
        
        if (!existingNotification) {
          notifications.push({
            id: `ticket-reply-${message.ticket_id}`,
            type: 'support_ticket_reply',
            title: 'New Ticket Reply',
            message: `${ticket.subject} - ${ticket.customers?.name || 'Customer'} replied`,
            link: `/dashboard/support/tickets/${message.ticket_id}`,
            created_at: message.created_at || new Date(),
            read: false,
            metadata: {
              ticket_id: message.ticket_id,
              message_id: message.id,
            },
          });
        }
      }
    }

    // 5b. Support tickets with recent admin replies (last 24 hours, from admins, not customers)
    // Get all recent messages and filter for admin replies
    const allRecentMessages = await prisma.support_ticket_messages.findMany({
      where: {
        tenant_id: tenant.id,
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
        user_id: {
          not: null,
        },
      },
      include: {
        support_tickets: {
          select: {
            id: true,
            subject: true,
            status: true,
            user_id: true,
            customers: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 20,
    });

    // Filter for admin replies (messages where user_id is NOT a customer)
    for (const message of allRecentMessages) {
      if (!message.user_id) continue;
      
      const ticket = message.support_tickets;
      // Check if this is an admin reply (user_id does NOT match ticket.user_id and is NOT in customers table)
      const isAdminReply = 
        message.user_id !== ticket.user_id && 
        !customerIds.has(message.user_id);
      
      if (isAdminReply && ticket.status !== 'closed') {
        // Check if we already have a notification for this ticket
        const existingNotification = notifications.find(
          (n) => n.id === `ticket-admin-reply-${message.ticket_id}`
        );
        
        if (!existingNotification) {
          notifications.push({
            id: `ticket-admin-reply-${message.ticket_id}`,
            type: 'support_ticket_reply',
            title: 'Admin Reply Added',
            message: `${ticket.subject} - Support team replied`,
            link: `/dashboard/support/tickets/${message.ticket_id}`,
            created_at: message.created_at || new Date(),
            read: false,
            metadata: {
              ticket_id: message.ticket_id,
              message_id: message.id,
            },
          });
        }
      }
    }

    // 5c. Support tickets with recent status changes (last 24 hours)
    // Only show if ticket was actually updated (not just created)
    const recentStatusChanges = await prisma.support_tickets.findMany({
      where: {
        tenant_id: tenant.id,
        updated_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
        status: {
          not: 'closed',
        },
      },
      select: {
        id: true,
        subject: true,
        status: true,
        updated_at: true,
        created_at: true,
        customers: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
      take: 10,
    });

    for (const ticket of recentStatusChanges) {
      // Only show if ticket was actually updated (not just created)
      // Check if updated_at is significantly different from created_at
      const wasUpdated = ticket.updated_at && ticket.created_at && 
        new Date(ticket.updated_at).getTime() > new Date(ticket.created_at).getTime() + 2000; // At least 2 seconds difference
      
      if (wasUpdated) {
        // Check if we already have a notification for this ticket (avoid duplicates)
        const existingReplyNotification = notifications.find(
          (n) => n.id === `ticket-reply-${ticket.id}` || n.id === `ticket-admin-reply-${ticket.id}`
        );
        const existingStatusNotification = notifications.find(
          (n) => n.id === `ticket-status-${ticket.id}`
        );
        
        // Only add status notification if there's no recent reply notification
        if (!existingReplyNotification && !existingStatusNotification) {
          notifications.push({
            id: `ticket-status-${ticket.id}`,
            type: 'support_ticket_reply', // Reuse type for now
            title: 'Ticket Updated',
            message: `${ticket.subject} - Status: ${ticket.status}`,
            link: `/dashboard/support/tickets/${ticket.id}`,
            created_at: ticket.updated_at || new Date(),
            read: false,
            metadata: {
              ticket_id: ticket.id,
              status: ticket.status,
            },
          });
        }
      }
    }

    // 6. Landlord support ticket notifications (for tenant dashboard)
    // Show notifications when landlord replies or status changes
    const landlordTickets = await prisma.landlord_support_tickets.findMany({
      where: {
        tenant_id: tenant.id,
        status: {
          not: 'closed',
        },
        updated_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      include: {
        landlord_support_ticket_messages: {
          where: {
            created_at: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
          orderBy: {
            created_at: 'desc',
          },
          take: 5, // Get more messages to check
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
      take: 10,
    });

    // Identify landlord replies by checking if message user_id is NOT the ticket creator
    // Landlord replies will have user_id that doesn't match ticket.user_id (which is tenant admin)

    for (const ticket of landlordTickets) {
      // Find recent messages that are NOT from the ticket creator (tenant admin)
      // These are likely from landlord
      const recentNonTenantMessages = ticket.landlord_support_ticket_messages.filter(
        (msg) => msg.user_id && msg.user_id !== ticket.user_id
      );

      if (recentNonTenantMessages.length > 0) {
        const latestReply = recentNonTenantMessages[0];
        notifications.push({
          id: `landlord-reply-${ticket.id}`,
          type: 'support_ticket_reply',
          title: 'Platform Support Reply',
          message: `${ticket.subject} - Platform team replied`,
          link: `/dashboard/support/landlord-tickets/${ticket.id}`,
          created_at: latestReply.created_at || new Date(),
          read: false,
          metadata: {
            ticket_id: ticket.id,
            message_id: latestReply.id,
          },
        });
      }

      // Check for status changes (if updated_at is significantly different from created_at)
      const wasUpdated = ticket.updated_at && ticket.created_at && 
        new Date(ticket.updated_at).getTime() > new Date(ticket.created_at).getTime() + 2000;
      
      if (wasUpdated && recentNonTenantMessages.length === 0) {
        // Only add status notification if there's no recent reply
        const existingNotification = notifications.find(
          (n) => n.id === `landlord-reply-${ticket.id}` || n.id === `landlord-status-${ticket.id}`
        );
        
        if (!existingNotification) {
          notifications.push({
            id: `landlord-status-${ticket.id}`,
            type: 'support_ticket_reply',
            title: 'Platform Ticket Updated',
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
      }
    }

    // 7. Low stock alerts
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
      const dateA = typeof a.created_at === 'string' ? new Date(a.created_at).getTime() : a.created_at.getTime();
      const dateB = typeof b.created_at === 'string' ? new Date(b.created_at).getTime() : b.created_at.getTime();
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

