/**
 * AI Usage & Billing (landlord admin) — docs/IMPLEMENTATION_TRACKER.md,
 * DA.15 (Claude-only) + DA.16 (added real Gemini tracking).
 *
 * Real, platform-wide usage from `ai_usage_log` — no estimates, no separate
 * tracking system. Every Claude route's recordAiUsage() call writes here
 * (provider='claude', the default); the onboarding Store Starter Pack
 * (src/app/api/onboarding/starter-pack/route.ts, the only real Gemini call
 * site in the app — content via gemini-2.5-flash, images via
 * gemini-3.1-flash-image-preview aka "Nano Banana") now writes here too
 * (provider='gemini'), with cost estimated from real token/image counts at
 * published list pricing — see @/lib/ai/gemini-cost.ts.
 *
 * `tenant_id` can be null for Gemini rows specifically: the starter-pack's
 * most common real path runs before a tenant exists (pre-registration
 * onboarding) — see migration
 * 20260824180000_ai_usage_log_provider_and_nullable_tenant.sql. Handled
 * explicitly below (an "Anonymous / pre-registration" row in the top-tenant
 * table), not silently dropped.
 *
 * (An earlier version of this page's copy incorrectly claimed Gemini had no
 * live integration at all — a bad `grep` gave a false negative, caught and
 * corrected, then closed properly with this tracking rather than left as a
 * documented gap.)
 */

import Link from 'next/link';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import AiUsageClient, { type AiUsageFeatureRow, type AiUsageTenantRow, type AiUsageDayRow } from './ai-usage-client';

export const dynamic = 'force-dynamic';

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function AiUsagePage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  const monthStart = startOfMonth();
  const trendStart = new Date();
  trendStart.setDate(trendStart.getDate() - 29);
  trendStart.setHours(0, 0, 0, 0);

  const [monthlyByFeature, allTimeTotal, monthlyTotal, monthlyByProvider, monthlyByTenant, trendRows] = await Promise.all([
    // This month's usage, grouped by feature/bucket/provider — the real
    // breakdown of what the assistant/description/photo-QA/starter-pack/etc.
    // features actually cost, and which provider each one runs on.
    prisma.ai_usage_log.groupBy({
      by: ['feature', 'bucket', 'provider'],
      where: { created_at: { gte: monthStart } },
      _sum: { item_count: true, estimated_cost: true, input_tokens: true, output_tokens: true },
      _count: { _all: true },
    }),
    // All-time total spend — a running total, not scoped to any one month.
    prisma.ai_usage_log.aggregate({
      _sum: { estimated_cost: true, item_count: true },
    }),
    // This month's total, across every feature/bucket/provider.
    prisma.ai_usage_log.aggregate({
      where: { created_at: { gte: monthStart } },
      _sum: { estimated_cost: true, item_count: true },
    }),
    // This month, split by provider — Claude vs Gemini, the whole point of DA.16.
    prisma.ai_usage_log.groupBy({
      by: ['provider'],
      where: { created_at: { gte: monthStart } },
      _sum: { item_count: true, estimated_cost: true },
    }),
    // This month, grouped by tenant — who's actually using it. tenant_id can
    // be null (anonymous/pre-registration Gemini usage), so this can't be
    // filtered to one provider — it's a real cross-provider view.
    prisma.ai_usage_log.groupBy({
      by: ['tenant_id'],
      where: { created_at: { gte: monthStart } },
      _sum: { item_count: true, estimated_cost: true },
      orderBy: { _sum: { estimated_cost: 'desc' } },
      take: 10,
    }),
    // Last 30 days, raw rows — bucketed by day in JS below. Real volume is
    // small enough at this stage (low tens of rows/month platform-wide)
    // that a raw SQL date_trunc would be premature; revisit if this page
    // ever needs to paginate.
    prisma.ai_usage_log.findMany({
      where: { created_at: { gte: trendStart } },
      select: { created_at: true, estimated_cost: true, item_count: true },
    }),
  ]);

  const providerTotals = {
    claude: { cost: 0, requests: 0 },
    gemini: { cost: 0, requests: 0 },
  };
  for (const row of monthlyByProvider) {
    const key = row.provider === 'gemini' ? 'gemini' : 'claude';
    providerTotals[key] = {
      cost: Number(row._sum.estimated_cost ?? 0),
      requests: row._sum.item_count ?? 0,
    };
  }

  // tenant_id can genuinely be null here — Gemini's starter-pack call site
  // can run before a tenant row exists (pre-registration onboarding). That
  // usage is real and worth showing, just not attributable to any tenant.
  const tenantIds = monthlyByTenant.map((r) => r.tenant_id).filter((id): id is string => id !== null);
  const tenants = tenantIds.length
    ? await prisma.tenants.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true, subdomain: true },
      })
    : [];
  const tenantById = new Map(tenants.map((t) => [t.id, t]));

  const featureRows: AiUsageFeatureRow[] = monthlyByFeature
    .map((row) => ({
      feature: row.feature,
      bucket: row.bucket,
      provider: row.provider === 'gemini' ? ('gemini' as const) : ('claude' as const),
      requests: row._sum.item_count ?? 0,
      cost: Number(row._sum.estimated_cost ?? 0),
      inputTokens: row._sum.input_tokens ?? 0,
      outputTokens: row._sum.output_tokens ?? 0,
      calls: row._count._all,
    }))
    .sort((a, b) => b.cost - a.cost);

  const tenantRows: AiUsageTenantRow[] = monthlyByTenant.map((row) => {
    const tenant = row.tenant_id ? tenantById.get(row.tenant_id) : undefined;
    return {
      tenantId: row.tenant_id,
      name: row.tenant_id ? (tenant?.name ?? '(deleted tenant)') : 'Anonymous / pre-registration',
      subdomain: tenant?.subdomain ?? null,
      requests: row._sum.item_count ?? 0,
      cost: Number(row._sum.estimated_cost ?? 0),
    };
  });

  // Bucket the raw 30-day rows by calendar day (local admin-server time —
  // fine for a trend chart, not a billing-critical figure).
  const dayMap = new Map<string, { cost: number; requests: number }>();
  for (const row of trendRows) {
    const created = row.created_at ?? new Date();
    const key = created.toISOString().slice(0, 10);
    const cur = dayMap.get(key) ?? { cost: 0, requests: 0 };
    cur.cost += Number(row.estimated_cost ?? 0);
    cur.requests += row.item_count ?? 0;
    dayMap.set(key, cur);
  }
  const trend: AiUsageDayRow[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(trendStart);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const bucket = dayMap.get(key);
    trend.push({ date: key, cost: bucket?.cost ?? 0, requests: bucket?.requests ?? 0 });
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Usage &amp; Billing</h1>
          <p className="text-muted-foreground mt-2">
            Real usage from every AI feature across the platform, and quick links to manage billing on the underlying AI providers.
          </p>
        </div>
        <Link href="/admin/price-plans" className="text-sm text-primary hover:underline whitespace-nowrap mt-1">
          Manage plan quotas →
        </Link>
      </div>
      <AiUsageClient
        allTimeCost={Number(allTimeTotal._sum.estimated_cost ?? 0)}
        allTimeRequests={allTimeTotal._sum.item_count ?? 0}
        monthCost={Number(monthlyTotal._sum.estimated_cost ?? 0)}
        monthRequests={monthlyTotal._sum.item_count ?? 0}
        providerTotals={providerTotals}
        featureRows={featureRows}
        tenantRows={tenantRows}
        trend={trend}
      />
    </div>
  );
}
