/**
 * Refunds & Returns Analytics API Route
 * 
 * Returns refund and return metrics:
 * - Refund rate
 * - Return rate
 * - Refund amounts
 * - Refund trends
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date();

    // Fetch all orders in period
    const allOrders = await prisma.orders.findMany({
      where: {
        tenant_id: tenant.id,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        total_amount: true,
        payment_status: true,
        status: true,
        created_at: true,
      },
    });

    // Identify refunded orders (status = 'refunded' or payment_status = 'refunded')
    const refundedOrders = allOrders.filter(
      (order: any) => 
        order.status === 'refunded' || 
        order.payment_status === 'refunded' ||
        order.payment_status === 'partially_refunded'
    );

    const totalOrders = allOrders.length;
    const refundedCount = refundedOrders.length;
    const totalRevenue = allOrders
      .filter((o: any) => o.payment_status === 'paid')
      .reduce((sum, o) => sum + Number(o.total_amount), 0);
    
    const refundedAmount = refundedOrders.reduce(
      (sum, o) => sum + Number(o.total_amount),
      0
    );

    const refundRate = totalOrders > 0
      ? (refundedCount / totalOrders) * 100
      : 0;

    // Refund trends by week
    const refundTrends: Record<string, { week: string; count: number; amount: number }> = {};
    
    refundedOrders.forEach((order: any) => {
      const orderDate = new Date(order.created_at);
      const weekStart = new Date(orderDate);
      weekStart.setDate(orderDate.getDate() - orderDate.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!refundTrends[weekKey]) {
        refundTrends[weekKey] = {
          week: weekKey,
          count: 0,
          amount: 0,
        };
      }
      refundTrends[weekKey].count += 1;
      refundTrends[weekKey].amount += Number(order.total_amount);
    });

    const data = {
      summary: {
        totalOrders,
        refundedOrders: refundedCount,
        totalRevenue,
        refundedAmount,
        refundRate: Number(refundRate.toFixed(2)),
        netRevenue: totalRevenue - refundedAmount,
      },
      trends: Object.values(refundTrends).sort(
        (a, b) => new Date(a.week).getTime() - new Date(b.week).getTime()
      ),
      note: 'Returns tracking requires order status management. Ensure refunded orders are properly marked.',
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching refunds analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch refunds analytics' },
      { status: error.status || 500 }
    );
  }
}
