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

/**
 * Theme Track B1.4 — Custom CSS is a Pro/Premium-only feature (real
 * sanitization exists, @/lib/themes/custom-css-sanitizer, but the ability
 * to set it at all is still gated — same reasoning as premium themes: a
 * real differentiator worth paying for, not a security question). Same
 * underlying check as hasPremiumThemeAccess — kept as its own named export
 * (not just an alias) so each call site reads as "does this tenant have
 * access to THIS feature", matching the per-feature-named-function
 * convention @/lib/analytics/plan-access.ts already established.
 */
export function hasCustomCssAccess(planName: string | null | undefined): boolean {
  return hasPremiumThemeAccess(planName);
}
