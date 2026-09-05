/**
 * Traffic Sources Analytics API Route
 * 
 * Returns traffic source breakdown:
 * - Direct traffic
 * - Search engines
 * - Social media
 * - Referrals
 * - UTM campaigns
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

    // Fetch sessions with traffic source data
    const sessions = await prisma.$queryRaw<Array<{
      referrer: string | null;
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      count: bigint;
    }>>`
      SELECT 
        referrer,
        utm_source,
        utm_medium,
        utm_campaign,
        COUNT(*)::bigint as count
      FROM analytics_sessions
      WHERE tenant_id = ${tenant.id}::uuid
        AND started_at >= ${startDate}
        AND started_at <= ${endDate}
      GROUP BY referrer, utm_source, utm_medium, utm_campaign
      ORDER BY count DESC
    `;

    // Categorize traffic sources
    const categorizeSource = (referrer: string | null, utmSource: string | null, utmMedium: string | null): string => {
      // UTM source takes priority
      if (utmSource) {
        return utmSource;
      }

      if (!referrer || referrer === 'direct' || referrer === '') {
        return 'Direct';
      }

      try {
        const url = new URL(referrer);
        const hostname = url.hostname.toLowerCase();

        // Search engines
        if (hostname.includes('google') || hostname.includes('bing') || hostname.includes('yahoo') || hostname.includes('duckduckgo')) {
          return 'Search';
        }

        // Social media
        if (hostname.includes('facebook') || hostname.includes('twitter') || hostname.includes('instagram') || 
            hostname.includes('linkedin') || hostname.includes('pinterest') || hostname.includes('tiktok')) {
          return 'Social';
        }

        // Referral
        return hostname;
      } catch {
        return 'Direct';
      }
    };

    // Aggregate by source
    const bySource: Record<string, { source: string; sessions: number; revenue: number }> = {};
    const byMedium: Record<string, number> = {};
    const byCampaign: Record<string, number> = {};

    sessions.forEach((session: any) => {
      const source = categorizeSource(session.referrer, session.utm_source, session.utm_medium);
      const count = Number(session.count);

      if (!bySource[source]) {
        bySource[source] = { source, sessions: 0, revenue: 0 };
      }
      bySource[source].sessions += count;

      if (session.utm_medium) {
        byMedium[session.utm_medium] = (byMedium[session.utm_medium] || 0) + count;
      }

      if (session.utm_campaign) {
        byCampaign[session.utm_campaign] = (byCampaign[session.utm_campaign] || 0) + count;
      }
    });

    // Calculate revenue by source (from orders linked to sessions)
    const ordersBySource = await prisma.$queryRaw<Array<{
      utm_source: string | null;
      referrer: string | null;
      revenue: number | null;
    }>>`
      SELECT 
        s.utm_source,
        s.referrer,
        COALESCE(SUM(o.total_amount), 0) as revenue
      FROM analytics_sessions s
      INNER JOIN analytics_events e ON s.session_id = e.session_id AND s.tenant_id = e.tenant_id
      INNER JOIN orders o ON e.order_id = o.id AND e.tenant_id = o.tenant_id
      WHERE s.tenant_id = ${tenant.id}::uuid
        AND s.started_at >= ${startDate}
        AND s.started_at <= ${endDate}
        AND e.event_name = 'checkout_complete'
        AND o.payment_status = 'paid'
      GROUP BY s.utm_source, s.referrer
    `;

    ordersBySource.forEach((order: any) => {
      const source = categorizeSource(order.referrer, order.utm_source, null);
      if (bySource[source]) {
        bySource[source].revenue += Number(order.revenue || 0);
      }
    });

    const data = {
      bySource: Object.values(bySource)
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 20),
      byMedium: Object.entries(byMedium)
        .map(([medium, count]) => ({ medium, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      byCampaign: Object.entries(byCampaign)
        .map(([campaign, count]) => ({ campaign, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      totalSessions: sessions.reduce((sum, s) => sum + Number(s.count), 0),
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching traffic sources:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch traffic sources' },
      { status: error.status || 500 }
    );
  }
}
