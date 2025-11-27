/**
 * Analytics Overview API Route
 * 
 * Returns high-level analytics metrics for the dashboard
 * Uses caching to reduce database load
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { cache, cacheKeys } from '@/lib/cache/simple-cache';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    // Try to get from cache first (cache for 30 seconds)
    const cacheKey = cacheKeys.analyticsOverview(tenant.id);
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Use raw SQL for better performance - single query for counts
    const [stats] = await prisma.$queryRaw<Array<{
      total_orders: bigint;
      total_revenue: number | null;
      total_customers: bigint;
      total_products: bigint;
      orders_this_month: bigint;
      revenue_this_month: number | null;
      new_customers_this_month: bigint;
      pending_orders: bigint;
    }>>`
      SELECT
        (SELECT COUNT(*) FROM orders WHERE tenant_id = ${tenant.id}::uuid) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE tenant_id = ${tenant.id}::uuid AND payment_status = 'paid') as total_revenue,
        (SELECT COUNT(*) FROM customers WHERE tenant_id = ${tenant.id}::uuid) as total_customers,
        (SELECT COUNT(*) FROM products WHERE tenant_id = ${tenant.id}::uuid AND status = 'active') as total_products,
        (SELECT COUNT(*) FROM orders WHERE tenant_id = ${tenant.id}::uuid AND created_at >= ${monthStart}) as orders_this_month,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE tenant_id = ${tenant.id}::uuid AND payment_status = 'paid' AND created_at >= ${monthStart}) as revenue_this_month,
        (SELECT COUNT(*) FROM customers WHERE tenant_id = ${tenant.id}::uuid AND created_at >= ${monthStart}) as new_customers_this_month,
        (SELECT COUNT(*) FROM orders WHERE tenant_id = ${tenant.id}::uuid AND status IN ('pending', 'processing')) as pending_orders
    `;

    const data = {
      overview: {
        totalOrders: Number(stats.total_orders),
        totalRevenue: Number(stats.total_revenue || 0),
        totalCustomers: Number(stats.total_customers),
        totalProducts: Number(stats.total_products),
      },
      thisMonth: {
        orders: Number(stats.orders_this_month),
        revenue: Number(stats.revenue_this_month || 0),
        newCustomers: Number(stats.new_customers_this_month),
      },
      pendingOrders: Number(stats.pending_orders),
    };

    // Cache for 30 seconds
    cache.set(cacheKey, data, 30);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching analytics overview:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: error.status || 500 }
    );
  }
}

