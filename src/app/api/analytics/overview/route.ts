/**
 * Analytics Overview API Route
 * 
 * Returns high-level analytics metrics for the dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    // Get date range from query params (default: last 30 days)
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date();

    // Parallel fetch all metrics for better performance
    const [
      totalOrders,
      totalRevenue,
      totalCustomers,
      totalProducts,
      ordersThisMonth,
      revenueThisMonth,
      newCustomersThisMonth,
      pendingOrders,
    ] = await Promise.all([
      // Total orders (all time)
      prisma.orders.count({
        where: {
          tenant_id: tenant.id,
        },
      }),
      // Total revenue (all time)
      prisma.orders.aggregate({
        where: {
          tenant_id: tenant.id,
          payment_status: 'paid',
        },
        _sum: {
          total_amount: true,
        },
      }),
      // Total customers
      prisma.customers.count({
        where: {
          tenant_id: tenant.id,
        },
      }),
      // Total products
      prisma.products.count({
        where: {
          tenant_id: tenant.id,
          status: 'active',
        },
      }),
      // Orders this month
      prisma.orders.count({
        where: {
          tenant_id: tenant.id,
          created_at: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      // Revenue this month
      prisma.orders.aggregate({
        where: {
          tenant_id: tenant.id,
          payment_status: 'paid',
          created_at: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: {
          total_amount: true,
        },
      }),
      // New customers this month
      prisma.customers.count({
        where: {
          tenant_id: tenant.id,
          created_at: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      // Pending orders
      prisma.orders.count({
        where: {
          tenant_id: tenant.id,
          status: {
            in: ['pending', 'processing'],
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalOrders,
          totalRevenue: Number(totalRevenue._sum.total_amount || 0),
          totalCustomers,
          totalProducts,
        },
        thisMonth: {
          orders: ordersThisMonth,
          revenue: Number(revenueThisMonth._sum.total_amount || 0),
          newCustomers: newCustomersThisMonth,
        },
        pendingOrders,
      },
    });
  } catch (error: any) {
    console.error('Error fetching analytics overview:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: error.status || 500 }
    );
  }
}

