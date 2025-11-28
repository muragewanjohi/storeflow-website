/**
 * Admin Notifications API Route
 * 
 * GET: Get aggregated notifications for landlord/admin dashboard
 * Includes landlord support tickets
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import type { Notification } from '@/lib/notifications/types';

/**
 * GET /api/admin/notifications - Get all notifications for landlord dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord'); // Use requireRole for API routes
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread_only') === 'true';

    const notifications: Notification[] = [];

    // 1. New landlord support tickets (open status, created in last 7 days)
    const newLandlordTickets = await prisma.landlord_support_tickets.findMany({
      where: {
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
        tenants: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 10,
    });

    for (const ticket of newLandlordTickets) {
      notifications.push({
        id: `landlord-ticket-new-${ticket.id}`,
        type: 'new_support_ticket',
        title: 'New Support Ticket',
        message: `${ticket.subject} - ${ticket.tenants?.name || 'Tenant'}`,
        link: `/admin/support/tickets/${ticket.id}`,
        created_at: ticket.created_at || new Date(),
        read: false,
        metadata: {
          ticket_id: ticket.id,
          priority: ticket.priority,
          tenant_id: ticket.tenants?.id,
        },
      });
    }

    // 2. Landlord support tickets with recent replies (messages in last 24 hours, from tenants)
    const recentLandlordTicketMessages = await prisma.landlord_support_ticket_messages.findMany({
      where: {
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      include: {
        landlord_support_tickets: {
          select: {
            id: true,
            subject: true,
            status: true,
            user_id: true,
            tenants: {
              select: {
                id: true,
                name: true,
                subdomain: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 10,
    });

    // Filter to only show replies from tenants (not landlord replies)
    // We check if the message user_id matches the ticket user_id (tenant admin)
    for (const message of recentLandlordTicketMessages) {
      const isTenantReply = message.user_id === message.landlord_support_tickets.user_id;
      if (isTenantReply && message.landlord_support_tickets.status !== 'closed') {
        // Check if we already have a notification for this ticket
        const existingNotification = notifications.find(
          (n) => n.id === `landlord-ticket-reply-${message.ticket_id}`
        );
        
        if (!existingNotification) {
          notifications.push({
            id: `landlord-ticket-reply-${message.ticket_id}`,
            type: 'support_ticket_reply',
            title: 'New Ticket Reply',
            message: `${message.landlord_support_tickets.subject} - ${message.landlord_support_tickets.tenants?.name || 'Tenant'} replied`,
            link: `/admin/support/tickets/${message.ticket_id}`,
            created_at: message.created_at || new Date(),
            read: false,
            metadata: {
              ticket_id: message.ticket_id,
              message_id: message.id,
              tenant_id: message.landlord_support_tickets.tenants?.id,
            },
          });
        }
      }
    }

    // Sort all notifications by created_at (most recent first)
    notifications.sort((a: any, b: any) => {
      const dateA = typeof a.created_at === 'string' ? new Date(a.created_at).getTime() : a.created_at.getTime();
      const dateB = typeof b.created_at === 'string' ? new Date(b.created_at).getTime() : b.created_at.getTime();
      return dateB - dateA;
    });

    // Filter unread only if requested
    const filteredNotifications = unreadOnly
      ? notifications.filter((n: any) => !n.read)
      : notifications;

    // Get unread count
    const unreadCount = notifications.filter((n: any) => !n.read).length;

    return NextResponse.json({
      success: true,
      notifications: filteredNotifications.slice(0, 20), // Limit to 20 most recent
      unread_count: unreadCount,
      total: notifications.length,
    });
  } catch (error: any) {
    console.error('Error fetching admin notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: error.status || 500 }
    );
  }
}

