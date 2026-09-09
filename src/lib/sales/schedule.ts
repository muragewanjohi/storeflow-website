/**
 * Sale schedule helpers — calendar-day boundaries so timezone-naive clients
 * (e.g. Flutter `toIso8601String()` without offset) still show as live when
 * the merchant intended "today through end date".
 */

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0,
    0,
    0,
    0,
  ));
}

export function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    23,
    59,
    59,
    999,
  ));
}

/**
 * Whether a sale should appear on the public storefront right now.
 * Uses UTC calendar-day bounds for start/end so a start stamped a few hours
 * "in the future" (local time misread as UTC) still counts as started today,
 * and an end at midnight of the end day still counts through that whole day.
 */
export function isSaleLiveAt(
  now: Date,
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined,
): boolean {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && Number.isNaN(start.getTime())) return false;
  if (end && Number.isNaN(end.getTime())) return false;

  if (start && now < startOfUtcDay(start)) return false;
  if (end && now > endOfUtcDay(end)) return false;
  return true;
}
