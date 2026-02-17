/**
 * Admin Analytics API
 * 
 * Fetches analytics data for the admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

interface DateRange {
  from?: string;
  to?: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthOrRedirect('/admin/login');
    await requireRoleOrRedirect(user, 'landlord', '/admin/login');

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month'; // day, month, year
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);

    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    if (from) startDate = new Date(from);
    if (to) endDate = new Date(to);

    // Fetch page views grouped by date
    const pageViews = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT 
        DATE(created_at)::text as date,
        COUNT(*)::bigint as count
      FROM analytics_tracking
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
        AND (event_name IS NULL OR event_name = 'admin_page_view')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Fetch events grouped by date
    const events = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT 
        DATE(created_at)::text as date,
        COUNT(*)::bigint as count
      FROM analytics_tracking
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
        AND event_name IS NOT NULL
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Fetch top pages
    const topPages = await prisma.$queryRaw<Array<{ page_path: string; count: bigint }>>`
      SELECT 
        page_path,
        COUNT(*)::bigint as count
      FROM analytics_tracking
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY page_path
      ORDER BY count DESC
      LIMIT 10
    `;

    // Fetch event types
    const eventTypes = await prisma.$queryRaw<Array<{ event_name: string; count: bigint }>>`
      SELECT 
        event_name,
        COUNT(*)::bigint as count
      FROM analytics_tracking
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
        AND event_name IS NOT NULL
      GROUP BY event_name
      ORDER BY count DESC
    `;

    // Fetch pageviews by country
    // Handle case where country column might not exist yet
    let pageviewsByCountry: Array<{ country: string | null; count: bigint }> = [];
    try {
      pageviewsByCountry = await prisma.$queryRaw<Array<{ country: string | null; count: bigint }>>`
        SELECT 
          COALESCE(country, 'Unknown') as country,
          COUNT(*)::bigint as count
        FROM analytics_tracking
        WHERE created_at >= ${startDate}
          AND created_at <= ${endDate}
          AND (event_name IS NULL OR event_name = 'admin_page_view')
        GROUP BY country
        ORDER BY count DESC
        LIMIT 10
      `;
    } catch (error: any) {
      // If country column doesn't exist, return empty array
      if (error?.code === '42703' || error?.message?.includes('column') || error?.message?.includes('country')) {
        console.warn('Country column not found in analytics_tracking table. Run the migration to add it.');
        pageviewsByCountry = [];
      } else {
        throw error;
      }
    }

    // Fetch tenant registrations grouped by date (excluding demo stores)
    const tenantRegistrations = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT 
        DATE(created_at)::text as date,
        COUNT(*)::bigint as count
      FROM tenants
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
        AND COALESCE((data->>'isDemo')::boolean, false) != true
        AND COALESCE((data->>'is_demo')::boolean, false) != true
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Fetch tenants by country (excluding demo stores)
    // Use country field directly, fallback to 'Unknown'
    const tenantsByCountry = await prisma.$queryRaw<Array<{ country_name: string; count: bigint }>>`
      SELECT 
        COALESCE(country, 'Unknown') as country_name,
        COUNT(*)::bigint as count
      FROM tenants
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
        AND COALESCE((data->>'isDemo')::boolean, false) != true
        AND COALESCE((data->>'is_demo')::boolean, false) != true
      GROUP BY country
      ORDER BY count DESC
      LIMIT 10
    `;

    // Fetch total tenant count (excluding demo stores)
    const totalTenants = await prisma.tenants.count({
      where: {
        NOT: {
          OR: [
            { data: { path: ['isDemo'], equals: true } },
            { data: { path: ['is_demo'], equals: true } },
          ],
        },
      },
    });

    // Fetch total stats
    const totalStats = await prisma.$queryRaw<Array<{ total_views: bigint; total_events: bigint; unique_users: bigint }>>`
      SELECT 
        COUNT(*) FILTER (WHERE event_name IS NULL OR event_name = 'admin_page_view')::bigint as total_views,
        COUNT(*) FILTER (WHERE event_name IS NOT NULL)::bigint as total_events,
        COUNT(DISTINCT user_id)::bigint as unique_users
      FROM analytics_tracking
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
    `;

    // Format data for charts
    const pageViewsData = pageViews.map((item) => ({
      date: item.date,
      views: Number(item.count),
    }));

    const eventsData = events.map((item) => ({
      date: item.date,
      events: Number(item.count),
    }));

    // Format tenant registration data
    const tenantData = tenantRegistrations.map((item) => ({
      date: item.date,
      tenants: Number(item.count),
    }));

    // Combine page views and events by date
    const combinedData = new Map<string, { date: string; views: number; events: number; tenants: number }>();
    
    pageViewsData.forEach((item) => {
      combinedData.set(item.date, { date: item.date, views: item.views, events: 0, tenants: 0 });
    });
    
    eventsData.forEach((item) => {
      const existing = combinedData.get(item.date);
      if (existing) {
        existing.events = item.events;
      } else {
        combinedData.set(item.date, { date: item.date, views: 0, events: item.events, tenants: 0 });
      }
    });

    // Add tenant registrations to combined data
    tenantData.forEach((item) => {
      const existing = combinedData.get(item.date);
      if (existing) {
        existing.tenants = item.tenants;
      } else {
        combinedData.set(item.date, { date: item.date, views: 0, events: 0, tenants: item.tenants });
      }
    });

    const chartData = Array.from(combinedData.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Create tenant registration chart data (separate for dedicated chart)
    // Ensure we always return an array, even if empty
    const tenantChartData = tenantData.length > 0 
      ? tenantData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      : [];

    const stats = totalStats[0] || { total_views: BigInt(0), total_events: BigInt(0), unique_users: BigInt(0) };

    return NextResponse.json({
      period,
      dateRange: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      stats: {
        totalViews: Number(stats.total_views),
        totalEvents: Number(stats.total_events),
        uniqueUsers: Number(stats.unique_users),
        totalTenants,
      },
      chartData,
      tenantChartData,
      topPages: topPages.map((item) => ({
        path: item.page_path,
        count: Number(item.count),
      })),
      eventTypes: eventTypes.map((item) => ({
        name: item.event_name,
        count: Number(item.count),
      })),
      pageviewsByCountry: pageviewsByCountry.map((item) => ({
        country: item.country || 'Unknown',
        count: Number(item.count),
      })),
      tenantsByCountry: tenantsByCountry.map((item) => ({
        country: item.country_name || 'Unknown',
        count: Number(item.count),
      })),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

