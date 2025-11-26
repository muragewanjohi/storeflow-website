/**
 * Analytics Comparison API Route
 * 
 * Compares analytics between two time periods
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
    
    // Period 1 (current/selected period)
    const startDate1 = searchParams.get('startDate1')
      ? new Date(searchParams.get('startDate1')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate1 = searchParams.get('endDate1')
      ? new Date(searchParams.get('endDate1')!)
      : new Date();

    // Period 2 (previous/comparison period)
    const period1Days = Math.ceil((endDate1.getTime() - startDate1.getTime()) / (1000 * 60 * 60 * 24));
    const startDate2 = searchParams.get('startDate2')
      ? new Date(searchParams.get('startDate2')!)
      : new Date(startDate1.getTime() - period1Days * 24 * 60 * 60 * 1000);
    const endDate2 = searchParams.get('endDate2')
      ? new Date(searchParams.get('endDate2')!)
      : new Date(startDate1.getTime() - 1);

    // Fetch metrics for both periods in parallel
    const [
      period1Orders,
      period1Revenue,
      period1Customers,
      period2Orders,
      period2Revenue,
      period2Customers,
    ] = await Promise.all([
      // Period 1 orders
      prisma.orders.count({
        where: {
          tenant_id: tenant.id,
          created_at: {
            gte: startDate1,
            lte: endDate1,
          },
        },
      }),
      // Period 1 revenue
      prisma.orders.aggregate({
        where: {
          tenant_id: tenant.id,
          payment_status: 'paid',
          created_at: {
            gte: startDate1,
            lte: endDate1,
          },
        },
        _sum: {
          total_amount: true,
        },
        _avg: {
          total_amount: true,
        },
      }),
      // Period 1 customers
      prisma.customers.count({
        where: {
          tenant_id: tenant.id,
          created_at: {
            gte: startDate1,
            lte: endDate1,
          },
        },
      }),
      // Period 2 orders
      prisma.orders.count({
        where: {
          tenant_id: tenant.id,
          created_at: {
            gte: startDate2,
            lte: endDate2,
          },
        },
      }),
      // Period 2 revenue
      prisma.orders.aggregate({
        where: {
          tenant_id: tenant.id,
          payment_status: 'paid',
          created_at: {
            gte: startDate2,
            lte: endDate2,
          },
        },
        _sum: {
          total_amount: true,
        },
        _avg: {
          total_amount: true,
        },
      }),
      // Period 2 customers
      prisma.customers.count({
        where: {
          tenant_id: tenant.id,
          created_at: {
            gte: startDate2,
            lte: endDate2,
          },
        },
      }),
    ]);

    const period1RevenueValue = Number(period1Revenue._sum.total_amount || 0);
    const period2RevenueValue = Number(period2Revenue._sum.total_amount || 0);
    const period1AvgOrderValue = Number(period1Revenue._avg.total_amount || 0);
    const period2AvgOrderValue = Number(period2Revenue._avg.total_amount || 0);

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const revenueChange = calculateChange(period1RevenueValue, period2RevenueValue);
    const ordersChange = calculateChange(period1Orders, period2Orders);
    const customersChange = calculateChange(period1Customers, period2Customers);
    const avgOrderValueChange = calculateChange(period1AvgOrderValue, period2AvgOrderValue);

    return NextResponse.json({
      success: true,
      data: {
        period1: {
          startDate: startDate1.toISOString(),
          endDate: endDate1.toISOString(),
          orders: period1Orders,
          revenue: period1RevenueValue,
          averageOrderValue: period1AvgOrderValue,
          newCustomers: period1Customers,
        },
        period2: {
          startDate: startDate2.toISOString(),
          endDate: endDate2.toISOString(),
          orders: period2Orders,
          revenue: period2RevenueValue,
          averageOrderValue: period2AvgOrderValue,
          newCustomers: period2Customers,
        },
        changes: {
          revenue: {
            value: period1RevenueValue - period2RevenueValue,
            percentage: Number(revenueChange.toFixed(2)),
            isPositive: revenueChange > 0,
          },
          orders: {
            value: period1Orders - period2Orders,
            percentage: Number(ordersChange.toFixed(2)),
            isPositive: ordersChange > 0,
          },
          customers: {
            value: period1Customers - period2Customers,
            percentage: Number(customersChange.toFixed(2)),
            isPositive: customersChange > 0,
          },
          averageOrderValue: {
            value: period1AvgOrderValue - period2AvgOrderValue,
            percentage: Number(avgOrderValueChange.toFixed(2)),
            isPositive: avgOrderValueChange > 0,
          },
        },
      },
    });
  } catch (error: any) {
    console.error('Error comparing analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to compare analytics' },
      { status: error.status || 500 }
    );
  }
}

