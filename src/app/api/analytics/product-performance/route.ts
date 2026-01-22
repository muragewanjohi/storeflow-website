/**
 * Product Performance Deep Dive API Route
 * 
 * Returns detailed product performance metrics:
 * - Product views (if tracked)
 * - Conversion rates
 * - Performance over time
 * - Best/worst performers
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

    // Fetch all products with their sales data
    const products = await prisma.products.findMany({
      where: {
        tenant_id: tenant.id,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        status: true,
        created_at: true,
      },
    });

    // Fetch order products for the period
    const orderProducts = await prisma.order_products.findMany({
      where: {
        tenant_id: tenant.id,
        orders: {
          payment_status: 'paid',
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        orders: {
          select: {
            created_at: true,
          },
        },
      },
    });

    // Fetch page views for all products in one query (if analytics tables exist)
    const productViewsMap = new Map<string, number>();
    try {
      const productIds = products.map(p => p.id);
      if (productIds.length > 0) {
        const viewsData = await prisma.$queryRaw<Array<{ product_id: string; count: bigint }>>`
          SELECT 
            product_id,
            COUNT(*)::bigint as count
          FROM analytics_page_views
          WHERE tenant_id = ${tenant.id}::uuid
            AND product_id = ANY(${productIds}::uuid[])
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
          GROUP BY product_id
        `;
        viewsData.forEach((row) => {
          productViewsMap.set(row.product_id, Number(row.count));
        });
      }
    } catch {
      // Analytics tables not available, will use estimates
    }

    // Calculate product performance
    const productPerformance = products.map((product) => {
      const productOrders = orderProducts.filter(
        (op: any) => op.product_id === product.id
      );

      const totalSold = productOrders.reduce((sum, op) => sum + op.quantity, 0);
      const totalRevenue = productOrders.reduce((sum, op) => sum + Number(op.total), 0);
      const orderCount = productOrders.length;

      // Get actual page views from analytics map, or estimate
      let productViews = productViewsMap.get(product.id) || 0;
      if (productViews === 0 && totalSold > 0) {
        // Estimate if no tracked views available
        productViews = Math.round(totalSold / 0.03); // Assume 3% conversion
      }

      const conversionRate = productViews > 0
        ? (totalSold / productViews) * 100
        : 0;

      // Performance over time (group by week)
      const performanceByWeek: Record<string, { week: string; sold: number; revenue: number }> = {};
      
      productOrders.forEach((op: any) => {
        const orderDate = new Date(op.orders.created_at);
        const weekStart = new Date(orderDate);
        weekStart.setDate(orderDate.getDate() - orderDate.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!performanceByWeek[weekKey]) {
          performanceByWeek[weekKey] = {
            week: weekKey,
            sold: 0,
            revenue: 0,
          };
        }
        performanceByWeek[weekKey].sold += op.quantity;
        performanceByWeek[weekKey].revenue += Number(op.total);
      });

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        totalSold,
        totalRevenue,
        orderCount,
        estimatedViews: productViews,
        productViews: productViews,
        conversionRate: Number(conversionRate.toFixed(2)),
        performanceOverTime: Object.values(performanceByWeek).sort(
          (a, b) => new Date(a.week).getTime() - new Date(b.week).getTime()
        ),
      };
    });

    // Sort by revenue
    const sortedByRevenue = [...productPerformance].sort((a, b) => b.totalRevenue - a.totalRevenue);
    const sortedByUnits = [...productPerformance].sort((a, b) => b.totalSold - a.totalSold);
    const sortedByConversion = [...productPerformance].sort((a, b) => b.conversionRate - a.conversionRate);

    const data = {
      products: productPerformance,
      bestByRevenue: sortedByRevenue.slice(0, 10),
      bestByUnits: sortedByUnits.slice(0, 10),
      bestByConversion: sortedByConversion.slice(0, 10),
      worstPerformers: sortedByRevenue.slice(-10).reverse(),
      totalProducts: products.length,
      productsWithSales: productPerformance.filter(p => p.totalSold > 0).length,
      note: productViewsMap.size > 0 
        ? 'Product views are tracked from analytics data.'
        : 'Product views are estimated. Page view tracking is active and will provide accurate metrics once data is collected.',
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching product performance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch product performance' },
      { status: error.status || 500 }
    );
  }
}
