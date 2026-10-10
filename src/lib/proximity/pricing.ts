/** Reserved-inventory price: section weekly rate × branch multiplier × billed weeks × week index. */

const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type RateCardInput = {
  defaultWeeklyRate: number | null;
  defaultDailyRate?: number | null;
  weekendMultiplier?: number;
  /** Sunday through Saturday, matching Date.getUTCDay(). */
  dayMultipliers?: number[] | null;
  smallMultiplier: number;
  largeMultiplier: number;
};

export type KindRateInput = {
  kind: string;
  weeklyRate: number;
};

export type WeekIndexInput = {
  startsOn: string;
  endsOn: string;
  multiplier: number;
};

export type PlacementPriceInput = {
  locationId: string;
  zoneId: string;
  locationName: string;
  zoneName: string;
  zoneKind: string;
  zoneWeeklyRate: number | null;
  priceTier: string;
  rateMultiplier: number | null;
};

export type QuoteLine = {
  locationId: string;
  zoneId: string;
  locationName: string;
  zoneName: string;
  weeklyRate: number;
  branchMultiplier: number;
  weekIndex: number;
  weekendFactor: number;
  billedWeeks: number;
  lineTotal: number;
};

export type PlacementQuote = {
  priced: boolean;
  total: number;
  basis: 'week' | 'day';
  billedWeeks: number;
  billedDays: number;
  weekIndex: number;
  weekendFactor: number;
  lines: QuoteLine[];
  missing: { locationName: string; zoneName: string }[];
};

export function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function nairobiDateKey(date: Date): string {
  return new Date(date.getTime() + NAIROBI_OFFSET_MS).toISOString().slice(0, 10);
}

function nextDateKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + DAY_MS).toISOString().slice(0, 10);
}

/** Inclusive Nairobi calendar days covered by the flight. */
export function flightNairobiDays(startsAt: Date, endsAt: Date): string[] {
  if (!(startsAt < endsAt)) return [];
  const startKey = nairobiDateKey(startsAt);
  const endKey = nairobiDateKey(new Date(endsAt.getTime() - 1));
  const days: string[] = [];
  let cursor = startKey;
  while (cursor <= endKey && days.length < 400) {
    days.push(cursor);
    cursor = nextDateKey(cursor);
  }
  return days;
}

export function billedWeeks(dayCount: number): number {
  if (dayCount <= 0) return 1;
  return Math.max(1, Math.ceil(dayCount / 7));
}

export function blendedWeekIndex(days: string[], indexes: WeekIndexInput[]): number {
  if (days.length === 0) return 1;
  const sum = days.reduce((total, day) => total + indexForDay(day, indexes), 0);
  return Math.round((sum / days.length) * 1000) / 1000;
}

/** Weekday of a Nairobi date key. 0 is Sunday. The key is already a calendar day, so UTC weekday matches it. */
export function weekdayOf(day: string): number {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date)).getUTCDay();
}

export function isWeekendDate(day: string): boolean {
  const weekday = weekdayOf(day);
  return weekday === 0 || weekday === 6;
}

/** Sunday first. Weekdays are 1. Saturday and Sunday use the weekend multiplier. */
export function defaultDayMultipliers(weekendMultiplier: number): number[] {
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) => (weekday === 0 || weekday === 6 ? weekendMultiplier : 1));
}

/** Average day multiplier across the campaign. Custom days replace the weekend default. */
export function blendedDayFactor(days: string[], dayMultipliers?: number[] | null, weekendMultiplier = 1): number {
  if (days.length === 0) return 1;
  const multipliers =
    dayMultipliers && dayMultipliers.length === 7 ? dayMultipliers : defaultDayMultipliers(weekendMultiplier);
  const sum = days.reduce((total, day) => total + (multipliers[weekdayOf(day)] ?? 1), 0);
  return Math.round((sum / days.length) * 1000) / 1000;
}

/** Average of 1 on weekdays and the weekend multiplier on Saturday and Sunday. */
export function blendedWeekendFactor(days: string[], weekendMultiplier = 1): number {
  return blendedDayFactor(days, null, weekendMultiplier);
}

function indexForDay(day: string, indexes: WeekIndexInput[]): number {
  const matches = indexes.filter((index) => index.startsOn <= day && day <= index.endsOn);
  if (matches.length === 0) return 1;
  return Math.max(...matches.map((index) => index.multiplier));
}

export function resolveWeeklyRate(
  placement: Pick<PlacementPriceInput, 'zoneWeeklyRate' | 'zoneKind'>,
  card: RateCardInput,
  kindRates: KindRateInput[]
): number | null {
  if (placement.zoneWeeklyRate != null) return placement.zoneWeeklyRate;
  const kind = kindRates.find((rate) => rate.kind === placement.zoneKind);
  if (kind) return kind.weeklyRate;
  return card.defaultWeeklyRate;
}

export function resolveBranchMultiplier(placement: Pick<PlacementPriceInput, 'priceTier' | 'rateMultiplier'>, card: RateCardInput): number {
  if (placement.rateMultiplier != null) return placement.rateMultiplier;
  if (placement.priceTier === 'large') return card.largeMultiplier;
  return card.smallMultiplier;
}

export function listWeeklyPrice(
  placement: PlacementPriceInput,
  card: RateCardInput,
  kindRates: KindRateInput[]
): number | null {
  const weeklyRate = resolveWeeklyRate(placement, card, kindRates);
  if (weeklyRate == null) return null;
  return money(weeklyRate * resolveBranchMultiplier(placement, card));
}

export function quotePlacements(input: {
  startsAt: Date;
  endsAt: Date;
  card: RateCardInput;
  kindRates: KindRateInput[];
  weekIndexes: WeekIndexInput[];
  placements: PlacementPriceInput[];
}): PlacementQuote {
  const days = flightNairobiDays(input.startsAt, input.endsAt);
  const weeks = billedWeeks(days.length);
  const weekIndex = blendedWeekIndex(days, input.weekIndexes);
  const weekendFactor = blendedDayFactor(days, input.card.dayMultipliers, input.card.weekendMultiplier ?? 1);
  const daily = days.length > 0 && days.length < 7 && input.card.defaultDailyRate != null;
  const missing: PlacementQuote['missing'] = [];
  const lines: QuoteLine[] = [];

  for (const placement of input.placements) {
    const weeklyRate = daily ? input.card.defaultDailyRate! : resolveWeeklyRate(placement, input.card, input.kindRates);
    if (weeklyRate == null) {
      missing.push({ locationName: placement.locationName, zoneName: placement.zoneName });
      continue;
    }
    const branchMultiplier = resolveBranchMultiplier(placement, input.card);
    const units = daily ? days.length : weeks;
    lines.push({
      locationId: placement.locationId,
      zoneId: placement.zoneId,
      locationName: placement.locationName,
      zoneName: placement.zoneName,
      weeklyRate,
      branchMultiplier,
      weekIndex,
      weekendFactor,
      billedWeeks: units,
      lineTotal: money(weeklyRate * branchMultiplier * units * weekIndex * weekendFactor),
    });
  }

  const priced = missing.length === 0 && lines.length === input.placements.length && input.placements.length > 0;
  return {
    priced,
    total: priced ? money(lines.reduce((sum, line) => sum + line.lineTotal, 0)) : 0,
    basis: daily ? 'day' : 'week',
    billedWeeks: weeks,
    billedDays: days.length,
    weekIndex,
    weekendFactor,
    lines: priced ? lines : [],
    missing,
  };
}
