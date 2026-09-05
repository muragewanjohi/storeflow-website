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
    
    // Set endDate to end of day (23:59:59.999) to include all data from that day
    let endDate: Date;
    if (searchParams.get('endDate')) {
      endDate = new Date(searchParams.get('endDate')!);
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate = new Date();
    }

    // Use tracked analytics data if available, otherwise fallback to order-based estimates
    let visitors = 0;
    let addToCart = 0;
    let checkoutStarted = 0;
    let completedOrders = 0;

    // First, always get the actual order counts as baseline
    const [paidOrders, allOrders] = await Promise.all([
      prisma.orders.count({
        where: {
          tenant_id: tenant.id,
          payment_status: 'paid',
          created_at: { gte: startDate, lte: endDate },
        },
      }),
      prisma.orders.count({
        where: {
          tenant_id: tenant.id,
          created_at: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Set minimum values from actual orders
    completedOrders = paidOrders;
    checkoutStarted = allOrders; // All orders at least reached checkout

    try {
      // Try to get actual tracked data from analytics tables
      const [sessionsData, addToCartData, checkoutStartData, checkoutCompleteData] = await Promise.all([
        // Total unique sessions (visitors)
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT session_id)::bigint as count
          FROM analytics_sessions
          WHERE tenant_id = ${tenant.id}::uuid
            AND started_at >= ${startDate}
            AND started_at <= ${endDate}
        `.catch(() => [{ count: BigInt(0) }]),
        // Add to cart events
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT session_id)::bigint as count
          FROM analytics_events
          WHERE tenant_id = ${tenant.id}::uuid
            AND event_name = 'add_to_cart'
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
        `.catch(() => [{ count: BigInt(0) }]),
        // Checkout start events
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT session_id)::bigint as count
          FROM analytics_events
          WHERE tenant_id = ${tenant.id}::uuid
            AND event_name = 'checkout_start'
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
        `.catch(() => [{ count: BigInt(0) }]),
        // Checkout complete events (linked to orders)
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT session_id)::bigint as count
          FROM analytics_events
          WHERE tenant_id = ${tenant.id}::uuid
            AND event_name = 'checkout_complete'
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
        `.catch(() => [{ count: BigInt(0) }]),
      ]);

      const trackedVisitors = Number(sessionsData[0]?.count || 0);
      const trackedAddToCart = Number(addToCartData[0]?.count || 0);
      const trackedCheckoutStart = Number(checkoutStartData[0]?.count || 0);
      const trackedCompletedOrders = Number(checkoutCompleteData[0]?.count || 0);

      // Use tracked data if available, otherwise use estimates based on orders
      visitors = trackedVisitors > 0 ? trackedVisitors : Math.max(allOrders * 10, 0);
      addToCart = Math.max(trackedAddToCart, allOrders); // At least as many as placed orders
      checkoutStarted = Math.max(trackedCheckoutStart, allOrders);
      completedOrders = Math.max(trackedCompletedOrders, paidOrders);
    } catch (error) {
      // Fallback to order-based estimates if analytics tables don't exist yet
      console.warn('Analytics tables not available, using estimates:', error);
      
      addToCart = allOrders;
      visitors = Math.max(allOrders * 10, 0);
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
