/**
 * Real-Time Analytics Polling API Route
 * 
 * Lightweight endpoint for polling real-time metrics
 * Optimized for frequent requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);

    // Get live sessions (active in last 5 minutes)
    let liveVisitors = 0;
    try {
      const liveSessions = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT session_id)::bigint as count
        FROM analytics_sessions
        WHERE tenant_id = ${tenant.id}::uuid
          AND last_activity_at >= ${last5Minutes}
      `;
      liveVisitors = Number(liveSessions[0]?.count || 0);
    } catch {
      // Analytics tables not available, estimate
      const hourlyOrders = await prisma.orders.count({
        where: {
          tenant_id: tenant.id,
          created_at: { gte: lastHour },
        },
      });
      liveVisitors = Math.max(hourlyOrders * 5, 0);
    }

    // Get recent orders
    const [hourlyOrders, todayRevenue, todayOrders, recentOrders] = await Promise.all([
      prisma.orders.count({
        where: {
          tenant_id: tenant.id,
          created_at: { gte: lastHour },
        },
      }),
      prisma.orders.aggregate({
        where: {
          tenant_id: tenant.id,
          payment_status: 'paid',
          created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        _sum: { total_amount: true },
      }),
      prisma.orders.count({
        where: {
          tenant_id: tenant.id,
          created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.orders.findMany({
        where: {
          tenant_id: tenant.id,
          created_at: { gte: last24Hours },
        },
        select: {
          id: true,
          order_number: true,
          total_amount: true,
          payment_status: true,
          created_at: true,
          name: true,
        },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
    ]);

    const data = {
      live: {
        estimatedVisitors: liveVisitors,
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
