/**
 * Real-Time Analytics API Route
 * 
 * Returns real-time metrics:
 * - Live visitors (estimated)
 * - Recent orders
 * - Current sales
 * - Recent activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    // Get recent orders (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    const [recentOrders, hourlyOrders, todayRevenue, todayOrders] = await Promise.all([
      // Recent orders (last 24 hours)
      prisma.orders.findMany({
        where: {
          tenant_id: tenant.id,
          created_at: {
            gte: last24Hours,
          },
        },
        select: {
          id: true,
          order_number: true,
          total_amount: true,
          payment_status: true,
          created_at: true,
          name: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 10,
      }),
      // Orders in last hour
      prisma.orders.count({
        where: {
          tenant_id: tenant.id,
          created_at: {
            gte: lastHour,
          },
        },
      }),
      // Today's revenue
      prisma.orders.aggregate({
        where: {
          tenant_id: tenant.id,
          payment_status: 'paid',
          created_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _sum: {
          total_amount: true,
        },
      }),
      // Today's orders
      prisma.orders.count({
        where: {
          tenant_id: tenant.id,
          created_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    // Estimate live visitors (in production, use actual session tracking)
    // For now, estimate based on recent activity
    const estimatedLiveVisitors = Math.max(
      hourlyOrders * 5, // Assume 5 visitors per order
      0
    );

    const data = {
      live: {
        estimatedVisitors: estimatedLiveVisitors,
        ordersLastHour: hourlyOrders,
        todayRevenue: Number(todayRevenue._sum.total_amount || 0),
        todayOrders: todayOrders,
      },
      recentOrders: recentOrders.map((order: any) => ({
        id: order.id,
        orderNumber: order.order_number,
        customerName: order.name,
        amount: Number(order.total_amount),
        status: order.payment_status,
        createdAt: order.created_at,
      })),
      timestamp: new Date().toISOString(),
      note: 'Live visitor count is estimated. Implement session tracking for accurate real-time metrics.',
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching real-time analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch real-time analytics' },
      { status: error.status || 500 }
    );
  }
}
