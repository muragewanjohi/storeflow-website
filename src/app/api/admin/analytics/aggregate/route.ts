/**
 * Analytics Aggregation API Route
 * 
 * This endpoint aggregates analytics data for all tenants
 * Should be called daily by a cron job to pre-compute analytics
 * 
 * Day 39-40: Background Jobs - Analytics Aggregation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getOrSetCache, cacheKeys, CACHE_TTL } from '@/lib/cache/redis';

/**
 * GET /api/admin/analytics/aggregate
 * Aggregate analytics data for all tenants
 * 
 * This endpoint:
 * - Pre-computes daily analytics for all tenants
 * - Stores aggregated data in cache
 * - Updates analytics summary tables (if needed)
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add secret token check for security
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Get all active tenants
    const tenants = await prisma.tenants.findMany({
      where: {
        status: {
          in: ['active', 'expired'], // Include expired (grace period)
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const results = {
      tenants_processed: 0,
      tenants_skipped: 0,
      errors: [] as string[],
    };

    // Aggregate analytics for each tenant
    for (const tenant of tenants) {
      try {
        // Aggregate yesterday's data
        const [yesterdayStats] = await prisma.$queryRaw<Array<{
          orders_count: bigint;
          revenue: number | null;
          customers_count: bigint;
          products_sold: bigint;
        }>>`
          SELECT
            COUNT(DISTINCT o.id)::bigint as orders_count,
            COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0) as revenue,
            COUNT(DISTINCT c.id)::bigint as customers_count,
            COALESCE(SUM(op.quantity), 0)::bigint as products_sold
          FROM orders o
          LEFT JOIN customers c ON c.tenant_id = o.tenant_id AND DATE(c.created_at) = DATE(${yesterday})
          LEFT JOIN order_products op ON op.order_id = o.id
          WHERE o.tenant_id = ${tenant.id}::uuid
            AND DATE(o.created_at) = DATE(${yesterday})
        `;

        // Cache aggregated data for quick access
        const dateStr = yesterday.toISOString().split('T')[0];
        const cacheKey = cacheKeys.analyticsOverview(tenant.id, `daily:${dateStr}`);
        await getOrSetCache(
          cacheKey,
          async () => ({
            date: dateStr,
            orders: Number(yesterdayStats.orders_count),
            revenue: Number(yesterdayStats.revenue || 0),
            customers: Number(yesterdayStats.customers_count),
            products_sold: Number(yesterdayStats.products_sold),
          }),
          { ttl: CACHE_TTL.VERY_LONG } // Cache for 24 hours
        );

        results.tenants_processed++;
      } catch (error) {
        const errorMsg = `Failed to aggregate analytics for tenant ${tenant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
        results.tenants_skipped++;
      }
    }

    return NextResponse.json(
      {
        message: 'Analytics aggregation completed',
        results,
        date: yesterday.toISOString().split('T')[0],
        timestamp: now.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error aggregating analytics:', error);
    return NextResponse.json(
      {
        message: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to aggregate analytics'
      },
      { status: 500 }
    );
  }
}

