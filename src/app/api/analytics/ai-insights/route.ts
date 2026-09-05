/**
 * Analytics Insight Summary — AI Phase 3.1 (docs/AI_FEATURES_PLAN.md)
 *
 * A proactive, one-click "explain my numbers" summary — different UX from
 * the Dashboard Assistant's reactive data_query (see
 * docs/DASHBOARD_AI_ASSISTANT_PLAN.md's "Relationship to existing phases"),
 * though it shares the same precision discipline: Claude never computes or
 * alters a number. This route computes a real analytics snapshot (lifetime
 * totals, this month, and a 30-day-vs-previous-30-day comparison with real
 * growth percentages — same shapes as the existing
 * /api/analytics/overview and /api/analytics/compare routes, computed
 * directly here rather than over an internal HTTP round-trip) and gives
 * Claude ONLY that job: narrate what the real numbers mean, never restate
 * them differently.
 *
 * Gated with the existing hasAdvancedAnalyticsAccess() (Pro/Premium only) —
 * not a parallel gate. This is checked explicitly, in addition to
 * guardAiRequest's quota check (whose 'analytics_insight' monthly limit is
 * already `null` for Basic by default — see limits.ts), because the
 * Pro/Premium-only rule is a real business rule independent of whatever a
 * given plan's `features` JSON happens to declare for quota purposes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { generateJson, estimateCostUsd } from '@/lib/ai/claude-client';
import { recordAiUsage } from '@/lib/ai/usage';
import { guardAiRequest } from '@/lib/ai/guard';
import { hasAdvancedAnalyticsAccess, getUpgradeMessage } from '@/lib/analytics/plan-access';

export const dynamic = 'force-dynamic';

const insightSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    highlights: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'highlights'],
  additionalProperties: false,
} as const;

interface InsightResult {
  summary: string;
  highlights: string[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function growthPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return round1(((current - previous) / previous) * 100);
}

async function getRealAnalyticsSnapshot(tenantId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const period1Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const period2Start = new Date(period1Start.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalOrdersAgg,
    totalCustomers,
    activeProducts,
    thisMonthAgg,
    newCustomersThisMonth,
    pendingOrders,
    period1Agg,
    period1Customers,
    period2Agg,
    period2Customers,
  ] = await Promise.all([
    prisma.orders.aggregate({
      where: { tenant_id: tenantId, payment_status: 'paid' },
      _sum: { total_amount: true },
      _count: true,
    }),
    prisma.customers.count({ where: { tenant_id: tenantId } }),
    prisma.products.count({ where: { tenant_id: tenantId, status: 'active' } }),
    prisma.orders.aggregate({
      where: { tenant_id: tenantId, payment_status: 'paid', created_at: { gte: monthStart } },
      _sum: { total_amount: true },
      _count: true,
    }),
    prisma.customers.count({ where: { tenant_id: tenantId, created_at: { gte: monthStart } } }),
    prisma.orders.count({ where: { tenant_id: tenantId, status: { in: ['pending', 'processing'] } } }),
    prisma.orders.aggregate({
      where: { tenant_id: tenantId, payment_status: 'paid', created_at: { gte: period1Start, lte: now } },
      _sum: { total_amount: true },
      _count: true,
    }),
    prisma.customers.count({ where: { tenant_id: tenantId, created_at: { gte: period1Start, lte: now } } }),
    prisma.orders.aggregate({
      where: { tenant_id: tenantId, payment_status: 'paid', created_at: { gte: period2Start, lt: period1Start } },
      _sum: { total_amount: true },
      _count: true,
    }),
    prisma.customers.count({ where: { tenant_id: tenantId, created_at: { gte: period2Start, lt: period1Start } } }),
  ]);

  const period1Revenue = Number(period1Agg._sum.total_amount ?? 0);
  const period2Revenue = Number(period2Agg._sum.total_amount ?? 0);

  return {
    currency: 'KES',
    totals: {
      orders: totalOrdersAgg._count,
      revenue: Number(totalOrdersAgg._sum.total_amount ?? 0),
      customers: totalCustomers,
      activeProducts,
    },
    thisMonth: {
      orders: thisMonthAgg._count,
      revenue: Number(thisMonthAgg._sum.total_amount ?? 0),
      newCustomers: newCustomersThisMonth,
    },
    pendingOrders,
    last30DaysVsPrior30Days: {
      revenue: { current: period1Revenue, previous: period2Revenue, growthPercent: growthPercent(period1Revenue, period2Revenue) },
      orders: {
        current: period1Agg._count,
        previous: period2Agg._count,
        growthPercent: growthPercent(period1Agg._count, period2Agg._count),
      },
      customers: {
        current: period1Customers,
        previous: period2Customers,
        growthPercent: growthPercent(period1Customers, period2Customers),
      },
    },
  };
}

function buildSystemPrompt(): string {
  return [
    'You are a business-analytics narrator for DukaNest, a Kenyan multi-tenant ecommerce platform.',
    "You will be given REAL, already-computed numbers for a merchant's store: lifetime totals, this month's figures, and a 30-day-vs-previous-30-day comparison with real growth percentages.",
    'Explain what these numbers mean in plain, honest language — encouraging where warranted, direct about declines too. Do not be generic; reference the actual figures.',
    'You must NEVER alter, recompute, round differently, or invent any number — use only the exact figures given, and only the metrics given.',
    'Write a summary of 2-4 sentences covering the most notable trend(s), then up to 3 short highlight bullet points (each one sentence).',
    'If a metric shows no meaningful change, you do not need to mention it.',
    'Return ONLY valid JSON with no markdown and no extra prose.',
  ].join(' ');
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const plan = tenant.plan_id
      ? await prisma.price_plans.findUnique({ where: { id: tenant.plan_id } })
      : null;

    if (!hasAdvancedAnalyticsAccess(plan?.name)) {
      return NextResponse.json({ error: getUpgradeMessage(plan?.name ?? null) }, { status: 403 });
    }

    const guard = await guardAiRequest(tenant, 'analytics_insight', 'monthly');
    if (!guard.ok) return guard.response;

    const snapshot = await getRealAnalyticsSnapshot(tenant.id);

    const { data, usage } = await generateJson<InsightResult>({
      system: buildSystemPrompt(),
      userContent: `Here is this merchant's real analytics data (all numbers already computed — do not alter them):\n${JSON.stringify(snapshot, null, 2)}`,
      schema: insightSchema,
      maxTokens: 400,
    });

    const estimatedCost = estimateCostUsd(usage);
    await recordAiUsage({
      tenantId: tenant.id,
      feature: 'analytics_insight',
      bucket: 'monthly',
      usage,
      estimatedCost,
      itemCount: 1,
    });

    return NextResponse.json({
      summary: data.summary,
      highlights: data.highlights,
      data: snapshot,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostUsd: estimatedCost,
      },
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Tenant not found') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    console.error('[Analytics AI Insights] Error:', error);
    return NextResponse.json(
      { error: 'AI insights are temporarily unavailable. Your analytics data is still available on this page.' },
      { status: 502 }
    );
  }
}
