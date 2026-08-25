/**
 * Theme Plan-Tier Access (Theme Track A4, docs/THEME_SYSTEM_PLAN.md)
 *
 * "Decide Basic-vs-Pro gating per theme, following the precedent already
 * set by plan-access.ts for advanced analytics." Same plan-name-substring
 * check as hasAdvancedAnalyticsAccess() (@/lib/analytics/plan-access.ts) —
 * deliberately not a new gating mechanism.
 *
 * Every theme currently ships with is_premium: false (DA.30) — this is the
 * real enforcement mechanism, ready the moment any theme's row is flipped
 * to is_premium: true, with zero further code changes needed.
 */

export function hasPremiumThemeAccess(planName: string | null | undefined): boolean {
  if (!planName) return false;
  const normalized = planName.toLowerCase();
  return normalized.includes('pro') || normalized.includes('premium');
}

export function canInstallTheme(
  planName: string | null | undefined,
  theme: { is_premium?: boolean | null }
): boolean {
  if (!theme.is_premium) return true;
  return hasPremiumThemeAccess(planName);
}
