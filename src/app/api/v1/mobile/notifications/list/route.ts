import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';

type MobileNotificationType =
  | 'new_order'
  | 'pending_payment'
  | 'low_stock'
  | 'new_support_ticket'
  | 'delivery_fee_approved'
  | 'delivery_fee_rejected';

interface MobileNotification {
  id: string;
  type: MobileNotificationType;
  title: string;
  message: string;
  createdAt: string;
  link: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only tenant users can access mobile notifications'),
        { status: 403 },
      );
    }

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const [pendingOrders, lowStockProducts, openTickets, approvedDelivery, rejectedDelivery] =
      await Promise.all([
        prisma.orders.findMany({
          where: {
            tenant_id: user.tenant_id,
            status: { in: ['pending', 'processing'] },
          },
          orderBy: { created_at: 'desc' },
          take: 10,
          select: {
            id: true,
            order_number: true,
            total_amount: true,
            payment_status: true,
            created_at: true,
          },
        }),
        prisma.products.findMany({
          where: {
            tenant_id: user.tenant_id,
            status: 'active',
            stock_quantity: { lte: 10, gt: 0 },
          },
          orderBy: { stock_quantity: 'asc' },
          take: 10,
          select: {
            id: true,
            name: true,
            sku: true,
            stock_quantity: true,
          },
        }),
        prisma.support_tickets.findMany({
          where: {
            tenant_id: user.tenant_id,
            status: 'open',
          },
          orderBy: { created_at: 'desc' },
          take: 5,
          select: {
            id: true,
            subject: true,
            created_at: true,
          },
        }),
        prisma.orders.findMany({
          where: {
            tenant_id: user.tenant_id,
            delivery_fee_status: 'approved',
          },
          orderBy: { updated_at: 'desc' },
          take: 5,
          select: {
            id: true,
            order_number: true,
            updated_at: true,
          },
        }),
        prisma.orders.findMany({
          where: {
            tenant_id: user.tenant_id,
            delivery_fee_status: 'rejected',
          },
          orderBy: { updated_at: 'desc' },
          take: 5,
          select: {
            id: true,
            order_number: true,
            updated_at: true,
          },
        }),
      ]);

    const notifications: MobileNotification[] = [
      ...pendingOrders.map((order) => ({
        id: `order-${order.id}`,
        type: (order.payment_status === 'pending' ? 'pending_payment' : 'new_order') as MobileNotificationType,
        title: order.payment_status === 'pending' ? 'Pending Payment' : 'New Order',
        message: `Order ${order.order_number} - ${Number(order.total_amount).toFixed(2)}`,
        createdAt: (order.created_at ?? new Date()).toISOString(),
        link: `/dashboard/orders/${order.id}`,
      })),
      ...lowStockProducts.map((product) => ({
        id: `stock-${product.id}`,
        type: 'low_stock' as const,
        title: 'Low Stock Alert',
        message: `${product.name}${product.sku ? ` (${product.sku})` : ''} - ${product.stock_quantity} remaining`,
        createdAt: new Date().toISOString(),
        link: '/dashboard/inventory',
      })),
      ...openTickets.map((ticket) => ({
        id: `ticket-${ticket.id}`,
        type: 'new_support_ticket' as const,
        title: 'New Support Ticket',
        message: ticket.subject || 'New support ticket received',
        createdAt: (ticket.created_at ?? new Date()).toISOString(),
        link: `/dashboard/support/tickets/${ticket.id}`,
      })),
      ...approvedDelivery.map((order) => ({
        id: `delivery-approved-${order.id}`,
        type: 'delivery_fee_approved' as const,
        title: 'Delivery Fee Approved',
        message: `Order ${order.order_number} delivery quote approved`,
        createdAt: (order.updated_at ?? new Date()).toISOString(),
        link: `/dashboard/orders/${order.id}`,
      })),
      ...rejectedDelivery.map((order) => ({
        id: `delivery-rejected-${order.id}`,
        type: 'delivery_fee_rejected' as const,
        title: 'Delivery Fee Rejected',
        message: `Order ${order.order_number} delivery quote rejected`,
        createdAt: (order.updated_at ?? new Date()).toISOString(),
        link: `/dashboard/orders/${order.id}`,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    return NextResponse.json(
      mobileSuccess({
        items: notifications,
        unreadCount: notifications.length,
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized mobile request')) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Missing or invalid bearer token'),
        { status: 401 },
      );
    }

    console.error('[Mobile Notifications List] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch notifications'),
      { status: 500 },
    );
  }
}
