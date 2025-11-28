/**
 * Customer Analytics API Route
 * 
 * Returns customer insights and acquisition metrics
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

    // Parallel fetch customer metrics
    const [
      totalCustomers,
      newCustomers,
      customersWithOrders,
      customerAcquisitionTrend,
      topCustomers,
      customerLifetimeValue,
    ] = await Promise.all([
      // Total customers
      prisma.customers.count({
        where: {
          tenant_id: tenant.id,
        },
      }),
      // New customers in period
      prisma.customers.count({
        where: {
          tenant_id: tenant.id,
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      // Customers who have placed orders (query orders and count unique user_ids)
      prisma.orders.findMany({
        where: {
          tenant_id: tenant.id,
          user_id: { not: null },
        },
        select: {
          user_id: true,
        },
        distinct: ['user_id'],
      }).then((orders: Array<{ user_id: string | null }>) => orders.length),
      // Customer acquisition trend (grouped by day/week/month)
      prisma.customers.findMany({
        where: {
          tenant_id: tenant.id,
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          created_at: true,
        },
        orderBy: {
          created_at: 'asc',
        },
      }),
      // Top customers by revenue - get customers with orders
      prisma.orders.findMany({
        where: {
          tenant_id: tenant.id,
          payment_status: 'paid',
          user_id: { not: null },
        },
        select: {
          user_id: true,
          total_amount: true,
        },
      }).then(async (orders: Array<{ user_id: string | null; total_amount: any }>) => {
        // Group by user_id and calculate totals
        const customerMap = new Map<string, { totalRevenue: number; orderCount: number }>();
        orders.forEach((order: any) => {
          if (!order.user_id) return;
          const existing = customerMap.get(order.user_id) || { totalRevenue: 0, orderCount: 0 };
          customerMap.set(order.user_id, {
            totalRevenue: existing.totalRevenue + Number(order.total_amount),
            orderCount: existing.orderCount + 1,
          });
        });

        // Get customer details for top customers
        const topCustomerIds = Array.from(customerMap.entries())
          .sort((a: any, b: any) => b[1].totalRevenue - a[1].totalRevenue)
          .slice(0, 10)
          .map(([id]) => id);

        const customers = await prisma.customers.findMany({
          where: {
            id: { in: topCustomerIds },
            tenant_id: tenant.id,
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });

        return customers.map((customer: typeof customers[0]) => {
          const stats = customerMap.get(customer.id)!;
          return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            orders: Array(stats.orderCount).fill({ total_amount: 0 }), // For compatibility
            _totalRevenue: stats.totalRevenue,
            _orderCount: stats.orderCount,
          };
        });
      }),
      // Calculate average customer lifetime value
      prisma.orders.aggregate({
        where: {
          tenant_id: tenant.id,
          payment_status: 'paid',
          user_id: { not: null },
        },
        _avg: {
          total_amount: true,
        },
        _sum: {
          total_amount: true,
        },
      }),
    ]);

    // Group customer acquisition by time period
    const acquisitionByPeriod: Record<string, number> = {};
    customerAcquisitionTrend.forEach((customer: typeof customerAcquisitionTrend[0]) => {
      const date = new Date(customer.created_at!);
      const key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      acquisitionByPeriod[key] = (acquisitionByPeriod[key] || 0) + 1;
    });

    const acquisitionTrend = Object.entries(acquisitionByPeriod)
      .map(([date, count]) => ({
        date,
        count,
      }))
      .sort((a: { date: string; count: number }, b: { date: string; count: number }) => a.date.localeCompare(b.date));

    // Calculate top customers by total revenue
    const topCustomersData = topCustomers
      .map((customer: any) => {
        const totalRevenue = customer._totalRevenue || 0;
        const orderCount = customer._orderCount || 0;
        return {
          id: customer.id,
          name: customer.name || customer.email,
          email: customer.email,
          totalRevenue,
          orderCount,
        };
      })
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Calculate customer lifetime value
    const avgOrderValue = Number(customerLifetimeValue._avg.total_amount || 0);
    const totalRevenue = Number(customerLifetimeValue._sum.total_amount || 0);
    const avgLifetimeValue = customersWithOrders > 0 ? totalRevenue / customersWithOrders : 0;

    // Calculate conversion rate (customers with orders / total customers)
    const conversionRate = totalCustomers > 0 ? (customersWithOrders / totalCustomers) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalCustomers,
        newCustomers,
        customersWithOrders,
        conversionRate: Number(conversionRate.toFixed(2)),
        acquisitionTrend,
        topCustomers: topCustomersData,
        lifetimeValue: {
          average: avgLifetimeValue,
          averageOrderValue: avgOrderValue,
        },
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching customer analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customer analytics' },
      { status: error.status || 500 }
    );
  }
}

