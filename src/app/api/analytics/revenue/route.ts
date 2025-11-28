/**
 * Revenue Analytics API Route
 * 
 * Returns revenue metrics and trends
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
    const groupBy = searchParams.get('groupBy') || 'day'; // 'day', 'week', 'month'

    // Fetch revenue trends over time
    const orders = await prisma.orders.findMany({
      where: {
        tenant_id: tenant.id,
        payment_status: 'paid',
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        total_amount: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    // Group revenue by time period
    const revenueByPeriod: Record<string, number> = {};
    
    orders.forEach((order: any) => {
      const date = new Date(order.created_at!);
      let key: string;
      
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      revenueByPeriod[key] = (revenueByPeriod[key] || 0) + Number(order.total_amount);
    });

    // Convert to array format for charts
    const revenueTrends = Object.entries(revenueByPeriod)
      .map(([date, revenue]) => ({
        date,
        revenue,
      }))
      .sort((a: any, b: any) => a.date.localeCompare(b.date));

    // Calculate total revenue for period
    const totalRevenue = orders.reduce((sum: any, order: any) => sum + Number(order.total_amount), 0);

    // Calculate average order value
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        averageOrderValue,
        trends: revenueTrends,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          groupBy,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching revenue analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch revenue analytics' },
      { status: error.status || 500 }
    );
  }
}

