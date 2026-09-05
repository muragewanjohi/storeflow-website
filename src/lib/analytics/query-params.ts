const DEFAULT_RANGE_MS = 30 * 24 * 60 * 60 * 1000;

export function getParam(searchParams: URLSearchParams, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value !== null && value !== '') {
      return value;
    }
  }
  return null;
}

export function parseEndOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function parseDateRange(
  searchParams: URLSearchParams,
  options?: { endOfDay?: boolean },
): { startDate: Date; endDate: Date } {
  const startRaw = getParam(searchParams, 'startDate', 'start_date');
  const endRaw = getParam(searchParams, 'endDate', 'end_date');

  const startDate = startRaw ? new Date(startRaw) : new Date(Date.now() - DEFAULT_RANGE_MS);

  let endDate: Date;
  if (endRaw) {
    endDate = new Date(endRaw);
    if (options?.endOfDay) {
      endDate = parseEndOfDay(endDate);
    }
  } else {
    endDate = new Date();
  }

  return { startDate, endDate };
}
