/**
 * Admin Marketing Stats API
 *
 * Returns conversion funnel stats for landlord dashboard:
 * - New registrations (CompleteRegistration)
 * - Subscription renewals
 * - Subscription activations
 * - Subscription upgrades
 */

import { NextRequest, NextResponse } from 'next/server';
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
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthOrRedirect('/admin/login');
    await requireRoleOrRedirect(user, 'landlord', '/admin/login');

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let { start, end } = getDateRange(period);
    if (from) start = new Date(from);
    if (to) end = new Date(to);

    // Registrations (new tenants) and subscription changes
    const [registrationsCount, renewalsCount, activationsCount, upgradesCount, registrationsByDate, renewalsByDate] =
      await Promise.all([
        prisma.tenants.count({ where: { created_at: { gte: start, lte: end } } }),
        prisma.subscription_changes.count({
          where: {
            change_type: 'renewal',
            effective_date: { gte: start, lte: end },
            status: 'completed',
          },
        }),
        prisma.subscription_changes.count({
          where: {
            change_type: 'activation',
            effective_date: { gte: start, lte: end },
            status: 'completed',
          },
        }),
        prisma.subscription_changes.count({
          where: {
            change_type: 'upgrade',
            effective_date: { gte: start, lte: end },
            status: 'completed',
          },
        }),
        prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
          SELECT DATE(created_at)::text as date, COUNT(*)::bigint as count
          FROM tenants
          WHERE created_at >= ${start} AND created_at <= ${end}
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `,
        prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
          SELECT DATE(effective_date)::text as date, COUNT(*)::bigint as count
          FROM subscription_changes
          WHERE change_type = 'renewal'
            AND effective_date >= ${start} AND effective_date <= ${end}
            AND status = 'completed'
          GROUP BY DATE(effective_date)
          ORDER BY date ASC
        `,
      ]);

    // Build chart data (combine registrations and renewals by date)
    const dateMap = new Map<string, { date: string; registrations: number; renewals: number }>();
    registrationsByDate.forEach((r) => {
      const n = Number(r.count);
      const existing = dateMap.get(r.date);
      if (existing) existing.registrations += n;
      else dateMap.set(r.date, { date: r.date, registrations: n, renewals: 0 });
    });
    renewalsByDate.forEach((r) => {
      const n = Number(r.count);
      const existing = dateMap.get(r.date);
      if (existing) existing.renewals += n;
      else dateMap.set(r.date, { date: r.date, registrations: 0, renewals: n });
    });
    const chartData = Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return NextResponse.json({
      period,
      dateRange: { from: start.toISOString(), to: end.toISOString() },
      stats: {
        registrations: registrationsCount,
        renewals: renewalsCount,
        activations: activationsCount,
        upgrades: upgradesCount,
      },
      chartData,
    });
  } catch (error) {
    console.error('[Marketing Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketing stats' },
      { status: 500 }
    );
  }
}
