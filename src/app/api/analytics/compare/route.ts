/**
 * Period Comparison Analytics API Route
 * 
 * Compares analytics between two time periods
 * Returns growth percentages and trend indicators
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
    const startDate1 = searchParams.get('startDate1')
      ? new Date(searchParams.get('startDate1')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate1 = searchParams.get('endDate1')
      ? new Date(searchParams.get('endDate1')!)
      : new Date();
    
    // Calculate period 2 dates (previous period of same length)
    const periodLength = endDate1.getTime() - startDate1.getTime();
    const startDate2 = new Date(startDate1.getTime() - periodLength);
    const endDate2 = new Date(startDate1);

    // Fetch data for both periods
    const [period1Data, period2Data] = await Promise.all([
      // Period 1
      Promise.all([
        prisma.orders.aggregate({
          where: {
            tenant_id: tenant.id,
            payment_status: 'paid',
            created_at: { gte: startDate1, lte: endDate1 },
          },
          _sum: { total_amount: true },
          _count: true,
        }),
        prisma.customers.count({
          where: {
            tenant_id: tenant.id,
            created_at: { gte: startDate1, lte: endDate1 },
          },
        }),
      ]),
      // Period 2
      Promise.all([
        prisma.orders.aggregate({
          where: {
            tenant_id: tenant.id,
            payment_status: 'paid',
            created_at: { gte: startDate2, lte: endDate2 },
          },
          _sum: { total_amount: true },
          _count: true,
        }),
        prisma.customers.count({
          where: {
            tenant_id: tenant.id,
            created_at: { gte: startDate2, lte: endDate2 },
          },
        }),
      ]),
    ]);

    const period1 = {
      revenue: Number(period1Data[0]._sum.total_amount || 0),
      orders: period1Data[0]._count,
      customers: period1Data[1],
      averageOrderValue: period1Data[0]._count > 0
        ? Number(period1Data[0]._sum.total_amount || 0) / period1Data[0]._count
        : 0,
    };

    const period2 = {
      revenue: Number(period2Data[0]._sum.total_amount || 0),
      orders: period2Data[0]._count,
      customers: period2Data[1],
      averageOrderValue: period2Data[0]._count > 0
        ? Number(period2Data[0]._sum.total_amount || 0) / period2Data[0]._count
        : 0,
    };

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const growth = {
      revenue: calculateGrowth(period1.revenue, period2.revenue),
      orders: calculateGrowth(period1.orders, period2.orders),
      customers: calculateGrowth(period1.customers, period2.customers),
      averageOrderValue: calculateGrowth(period1.averageOrderValue, period2.averageOrderValue),
    };

    const data = {
      period1: {
        ...period1,
        startDate: startDate1.toISOString(),
        endDate: endDate1.toISOString(),
      },
      period2: {
        ...period2,
        startDate: startDate2.toISOString(),
        endDate: endDate2.toISOString(),
      },
      growth,
      trends: {
        revenue: growth.revenue >= 0 ? 'up' : 'down',
        orders: growth.orders >= 0 ? 'up' : 'down',
        customers: growth.customers >= 0 ? 'up' : 'down',
        averageOrderValue: growth.averageOrderValue >= 0 ? 'up' : 'down',
      },
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error comparing periods:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to compare periods' },
      { status: error.status || 500 }
    );
  }
}
