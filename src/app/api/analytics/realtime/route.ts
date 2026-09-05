/**
 * Real-Time Analytics API Route
 * 
 * Returns real-time metrics:
 * - Live visitors (from actual session data)
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
    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
    const last15Minutes = new Date(Date.now() - 15 * 60 * 1000);

    const [recentOrders, hourlyOrders, todayRevenue, todayOrders, liveVisitors, recentVisitors] = await Promise.all([
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
      // Live visitors (active sessions in last 5 minutes)
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT session_id) as count
        FROM analytics_sessions
        WHERE tenant_id = ${tenant.id}::uuid
          AND last_activity_at >= ${last5Minutes}
      `.catch(() => [{ count: BigInt(0) }]),
      // Recent visitors (active sessions in last 15 minutes)
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT session_id) as count
        FROM analytics_sessions
        WHERE tenant_id = ${tenant.id}::uuid
          AND last_activity_at >= ${last15Minutes}
      `.catch(() => [{ count: BigInt(0) }]),
    ]);

    // Get actual live visitor count from session data
    const actualLiveVisitors = Number(liveVisitors[0]?.count || 0);
    const actualRecentVisitors = Number(recentVisitors[0]?.count || 0);

    const data = {
      live: {
        estimatedVisitors: actualLiveVisitors,
        recentVisitors: actualRecentVisitors,
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
