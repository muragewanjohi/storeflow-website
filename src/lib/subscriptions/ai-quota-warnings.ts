/**
 * AI Phase 8.2 — usage-vs-limit upgrade nudges (docs/AI_FEATURES_PLAN.md
 * "Phase 8", docs/IMPLEMENTATION_TRACKER.md DA.18).
 *
 * "Mostly rules-based (SQL against PlanLimits/ai_usage_log) — Claude is
 * only needed if you want a personalized nudge message rather than a
 * templated one; a static template is cheaper and more predictable, and is
 * the recommended default." — this implements exactly that recommended
 * default: no AI call, real usage compared against the tenant's real
 * (DA.14 admin-editable) plan quota, a deterministic templated message.
 *
 * Surfaced through the existing computed-notifications pattern (both
 * src/app/api/notifications/route.ts and
 * src/app/api/v1/mobile/notifications/list/route.ts already compute
 * notifications on read from real underlying data — orders, low stock,
 * tickets — rather than a persisted notification log; this is one more
 * entry in that same list, not a new delivery mechanism).
 *
 * Only the MONTHLY bucket is checked — the setup bucket is a one-time
 * onboarding allowance, not something worth nudging a merchant about
 * mid-month (per AI_FEATURES_PLAN.md's plan-quotas section, a legitimate
 * onboarding burst can reasonably use most of it; that's by design, not a
 * warning sign).
 */

import { prisma } from '@/lib/prisma/client';
import type { Tenant } from '@/lib/tenant-context';
import { effectiveAiPlanLimits, type AiPlanLimits } from './limits';
import type { AiFeature } from '@/lib/ai/types';
import { aiFeatureLabel } from '@/lib/ai/feature-labels';

const WARNING_THRESHOLD = 0.8;

type MonthlyLimitKey = keyof AiPlanLimits['monthly'];

/**
 * Which real ai_usage_log `feature` values count toward each quota bucket.
 * Mirrors getAiFeatureLimit() (@/lib/subscriptions/limits.ts) — descriptions
 * and photo QA share one counter there, so they're summed together here too;
 * every other bucket maps to exactly one feature. Gemini features
 * (starter_pack_content/starter_pack_image) aren't included: DA.16 tracks
 * their cost for visibility, but they have no quota field in AiPlanLimits
 * (getAiFeatureLimit() returns undefined for them, i.e. unlimited-by-design)
 * — nothing to warn about yet.
 */
const MONTHLY_QUOTA_GROUPS: { limitKey: MonthlyLimitKey; features: AiFeature[] }[] = [
  { limitKey: 'descriptionsAndPhotoQa', features: ['product_description', 'photo_qa'] },
  { limitKey: 'marketingImages', features: ['marketing_image_prompt'] },
  { limitKey: 'analyticsInsights', features: ['analytics_insight'] },
  { limitKey: 'assistantQueries', features: ['assistant_query'] },
];

export interface AiQuotaWarning {
  /** Deterministic — safe to use as a notification id, stable across reads. */
  id: string;
  limitKey: MonthlyLimitKey;
  label: string;
  current: number;
  limit: number;
  severity: 'warning' | 'reached';
}

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Real usage vs real quota, per monthly bucket, for one tenant — only
 * returns entries at or above the warning threshold (80%) so callers never
 * have to re-filter. Returns [] for a tenant with no plan, an unknown plan,
 * or usage comfortably under every quota (the common case).
 */
export async function getAiQuotaWarnings(tenant: Tenant): Promise<AiQuotaWarning[]> {
  if (!tenant.plan_id) return [];

  const plan = await prisma.price_plans.findUnique({ where: { id: tenant.plan_id } });
  if (!plan) return [];

  const monthlyLimits = effectiveAiPlanLimits(plan.features, plan.name).monthly;

  const usageRows = await prisma.ai_usage_log.groupBy({
    by: ['feature'],
    where: { tenant_id: tenant.id, bucket: 'monthly', created_at: { gte: startOfCurrentMonth() } },
    _sum: { item_count: true },
  });
  const usageByFeature = new Map(usageRows.map((row) => [row.feature, row._sum.item_count ?? 0]));

  const warnings: AiQuotaWarning[] = [];
  for (const group of MONTHLY_QUOTA_GROUPS) {
    const limit = monthlyLimits[group.limitKey];
    // null = not available on this plan (nothing to warn about — there's no
    // quota to approach); undefined never occurs here since
    // effectiveAiPlanLimits() always resolves to a real number or null, but
    // the check is defensive either way.
    if (limit === null || limit === undefined || limit <= 0) continue;

    const current = group.features.reduce((sum, feature) => sum + (usageByFeature.get(feature) ?? 0), 0);
    if (current === 0) continue;

    const ratio = current / limit;
    if (ratio < WARNING_THRESHOLD) continue;

    warnings.push({
      id: `ai-quota-${group.limitKey}`,
      limitKey: group.limitKey,
      label: aiFeatureLabel(group.features[0]),
      current,
      limit,
      severity: ratio >= 1 ? 'reached' : 'warning',
    });
  }

  return warnings;
}

/** Deterministic, templated copy for one warning — no Claude call, per the recommended default above. */
export function formatAiQuotaWarning(warning: AiQuotaWarning): { title: string; message: string } {
  const percent = Math.round((warning.current / warning.limit) * 100);
  if (warning.severity === 'reached') {
    return {
      title: `${warning.label} limit reached`,
      message: `You've used ${warning.current}/${warning.limit} this month. Upgrade your plan for a higher limit.`,
    };
  }
  return {
    title: `Approaching your ${warning.label} limit`,
    message: `You've used ${warning.current}/${warning.limit} (${percent}%) this month. Consider upgrading if you'll need more.`,
  };
}
