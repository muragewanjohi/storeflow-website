/**
 * Admin Acquisition Funnel API
 *
 * Landlord-facing marketing funnel for ad-to-signup conversion.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;

  switch (period) {
    case 'day':
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'month':
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  return { start, end };
}

function toPercent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthOrRedirect('/admin/login');
    await requireRoleOrRedirect(user, 'landlord', '/admin/login');

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');
    const utmCampaign = searchParams.get('utm_campaign');

    let { start, end } = getDateRange(period);
    if (from) start = new Date(from);
    if (to) end = new Date(to);

    const whereClauses: Prisma.Sql[] = [
      Prisma.sql`created_at >= ${start}`,
      Prisma.sql`created_at <= ${end}`,
      Prisma.sql`event_name IN ('ad_landing_page_view', 'ad_cta_click', 'sign_up_started', 'sign_up_failed', 'sign_up_completed')`,
    ];

    if (utmSource) {
      whereClauses.push(Prisma.sql`metadata->>'utm_source' = ${utmSource}`);
    }
    if (utmMedium) {
      whereClauses.push(Prisma.sql`metadata->>'utm_medium' = ${utmMedium}`);
    }
    if (utmCampaign) {
      whereClauses.push(Prisma.sql`metadata->>'utm_campaign' = ${utmCampaign}`);
    }

    const whereSql = Prisma.join(whereClauses, ' AND ');

    const eventCounts = await prisma.$queryRaw<Array<{ event_name: string | null; count: bigint }>>(
      Prisma.sql`
        SELECT event_name, COUNT(*)::bigint AS count
        FROM analytics_tracking
        WHERE ${whereSql}
        GROUP BY event_name
      `
    );

    const campaignBreakdown = await prisma.$queryRaw<
      Array<{
        campaign: string;
        landing_views: bigint;
        cta_clicks: bigint;
        signup_started: bigint;
        signup_failed: bigint;
        signup_completed: bigint;
      }>
    >(
      Prisma.sql`
        SELECT
          COALESCE(NULLIF(metadata->>'utm_campaign', ''), 'unknown') AS campaign,
          COUNT(*) FILTER (WHERE event_name = 'ad_landing_page_view')::bigint AS landing_views,
          COUNT(*) FILTER (WHERE event_name = 'ad_cta_click')::bigint AS cta_clicks,
          COUNT(*) FILTER (WHERE event_name = 'sign_up_started')::bigint AS signup_started,
          COUNT(*) FILTER (WHERE event_name = 'sign_up_failed')::bigint AS signup_failed,
          COUNT(*) FILTER (WHERE event_name = 'sign_up_completed')::bigint AS signup_completed
        FROM analytics_tracking
        WHERE ${whereSql}
        GROUP BY COALESCE(NULLIF(metadata->>'utm_campaign', ''), 'unknown')
        ORDER BY landing_views DESC
      `
    );

    const countsByName = new Map<string, number>();
    for (const row of eventCounts) {
      if (row.event_name) countsByName.set(row.event_name, Number(row.count || 0));
    }

    const landingViews = countsByName.get('ad_landing_page_view') || 0;
    const ctaClicks = countsByName.get('ad_cta_click') || 0;
    const signUpStarted = countsByName.get('sign_up_started') || 0;
    const signUpFailed = countsByName.get('sign_up_failed') || 0;
    const signUpCompleted = countsByName.get('sign_up_completed') || 0;

    return NextResponse.json({
      period,
      dateRange: { from: start.toISOString(), to: end.toISOString() },
      filters: {
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
      },
      funnel: {
        landingViews,
        ctaClicks,
        signUpStarted,
        signUpFailed,
        signUpCompleted,
      },
      rates: {
        landingToCtaRate: toPercent(ctaClicks, landingViews),
        ctaToSignupStartRate: toPercent(signUpStarted, ctaClicks),
        signupStartToCompleteRate: toPercent(signUpCompleted, signUpStarted),
        overallLandingToCompleteRate: toPercent(signUpCompleted, landingViews),
      },
      campaigns: campaignBreakdown.map((row) => {
        const rowLandingViews = Number(row.landing_views || 0);
        const rowCtaClicks = Number(row.cta_clicks || 0);
        const rowSignupStarted = Number(row.signup_started || 0);
        const rowSignupFailed = Number(row.signup_failed || 0);
        const rowSignupCompleted = Number(row.signup_completed || 0);

        return {
          campaign: row.campaign,
          landingViews: rowLandingViews,
          ctaClicks: rowCtaClicks,
          signUpStarted: rowSignupStarted,
          signUpFailed: rowSignupFailed,
          signUpCompleted: rowSignupCompleted,
          overallLandingToCompleteRate: toPercent(rowSignupCompleted, rowLandingViews),
        };
      }),
    });
  } catch (error) {
    console.error('[Acquisition Funnel] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch acquisition funnel data' },
      { status: 500 }
    );
  }
}
