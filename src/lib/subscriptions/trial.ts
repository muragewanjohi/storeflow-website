/**
 * Trial period helpers — shared by web dashboard and mobile API.
 *
 * Primary source: `tenants.start_date` + `price_plans.trial_days` (dashboard home banner).
 * Fallback when `start_date` is missing: days until `tenants.expire_date`, only while
 * that count is within `trial_days` (subscription page heuristic).
 */

export type TrialPeriodInput = {
  trialDays: number | null | undefined;
  startDate?: Date | string | null;
  expireDate?: Date | string | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Calendar days from now until `date` (ceil), matching subscription UI. */
export function getDaysUntil(date: Date | string | null | undefined): number {
  const d = parseDate(date);
  if (!d) return 0;
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / MS_PER_DAY);
}

/**
 * Days left in the plan trial, or `null` if there is no trial or it has ended.
 */
export function getTrialDaysRemaining(input: TrialPeriodInput): number | null {
  const trialDays = input.trialDays;
  if (!trialDays || trialDays <= 0) return null;

  const expire = parseDate(input.expireDate);
  const daysUntilExpire = expire ? getDaysUntil(expire) : null;
  if (daysUntilExpire != null && daysUntilExpire <= 0) return null;

  const start = parseDate(input.startDate);
  if (start) {
    const daysSinceStart = Math.floor((Date.now() - start.getTime()) / MS_PER_DAY);
    if (daysSinceStart >= trialDays) return null;
    const fromStart = Math.max(0, trialDays - daysSinceStart);
    if (daysUntilExpire != null) {
      return Math.min(fromStart, daysUntilExpire);
    }
    return fromStart;
  }

  if (!expire || daysUntilExpire == null) return null;
  if (daysUntilExpire > trialDays) return null;
  return daysUntilExpire;
}

export function isInTrialPeriod(input: TrialPeriodInput): boolean {
  const remaining = getTrialDaysRemaining(input);
  return remaining != null && remaining > 0;
}
