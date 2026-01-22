/**
 * Conversion Funnel Analytics API Route
 * 
 * Returns conversion funnel metrics:
 * - Visitors (sessions)
 * - Add to Cart
 * - Checkout Started
 * - Orders Completed
 * - Conversion rates at each step
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

    // Use tracked analytics data if available, otherwise fallback to estimates
    let visitors = 0;
    let addToCart = 0;
    let checkoutStarted = 0;
    let completedOrders = 0;

    try {
      // Get actual tracked data from analytics tables
      const [sessionsData, addToCartData, checkoutStartData, checkoutCompleteData] = await Promise.all([
        // Total unique sessions (visitors)
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT session_id)::bigint as count
          FROM analytics_sessions
          WHERE tenant_id = ${tenant.id}::uuid
            AND started_at >= ${startDate}
            AND started_at <= ${endDate}
        `,
        // Add to cart events
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT session_id)::bigint as count
          FROM analytics_events
          WHERE tenant_id = ${tenant.id}::uuid
            AND event_name = 'add_to_cart'
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
        `,
        // Checkout start events
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT session_id)::bigint as count
          FROM analytics_events
          WHERE tenant_id = ${tenant.id}::uuid
            AND event_name = 'checkout_start'
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
        `,
        // Checkout complete events (linked to orders)
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT session_id)::bigint as count
          FROM analytics_events
          WHERE tenant_id = ${tenant.id}::uuid
            AND event_name = 'checkout_complete'
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
        `,
      ]);

      visitors = Number(sessionsData[0]?.count || 0);
      addToCart = Number(addToCartData[0]?.count || 0);
      checkoutStarted = Number(checkoutStartData[0]?.count || 0);
      completedOrders = Number(checkoutCompleteData[0]?.count || 0);
    } catch (error) {
      // Fallback to order-based estimates if analytics tables don't exist yet
      console.warn('Analytics tables not available, using estimates:', error);
      
      completedOrders = await prisma.orders.count({
        where: {
          tenant_id: tenant.id,
          payment_status: 'paid',
          created_at: { gte: startDate, lte: endDate },
        },
      });

      checkoutStarted = await prisma.orders.count({
        where: {
          tenant_id: tenant.id,
          created_at: { gte: startDate, lte: endDate },
        },
      });

      const orderProducts = await prisma.order_products.findMany({
        where: {
          tenant_id: tenant.id,
          orders: { created_at: { gte: startDate, lte: endDate } },
        },
        select: { order_id: true },
        distinct: ['order_id'],
      });

      addToCart = orderProducts.length;
      visitors = Math.max(checkoutStarted * 10, completedOrders * 20);
    }

    // Calculate conversion rates
    const addToCartRate = visitors > 0 
      ? (addToCart / visitors) * 100 
      : 0;
    
    const checkoutRate = visitors > 0
      ? (checkoutStarted / visitors) * 100
      : 0;
    
    const conversionRate = visitors > 0
      ? (completedOrders / visitors) * 100
      : 0;

    const cartAbandonmentRate = addToCart > 0
      ? ((addToCart - checkoutStarted) / addToCart) * 100
      : 0;

    const checkoutAbandonmentRate = checkoutStarted > 0
      ? ((checkoutStarted - completedOrders) / checkoutStarted) * 100
      : 0;

    const data = {
      funnel: {
        visitors: visitors,
        addToCart: addToCart,
        checkoutStarted: checkoutStarted,
        ordersCompleted: completedOrders,
      },
      rates: {
        addToCartRate: Number(addToCartRate.toFixed(2)),
        checkoutRate: Number(checkoutRate.toFixed(2)),
        conversionRate: Number(conversionRate.toFixed(2)),
        cartAbandonmentRate: Number(cartAbandonmentRate.toFixed(2)),
        checkoutAbandonmentRate: Number(checkoutAbandonmentRate.toFixed(2)),
      },
      note: 'Visitor estimates are based on order data. For accurate metrics, implement session tracking.',
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching conversion funnel:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversion funnel' },
      { status: error.status || 500 }
    );
  }
}
