import { quotePlacements, type PlacementPriceInput, type RateCardInput } from '../pricing';

const card: RateCardInput = {
  defaultWeeklyRate: 10000,
  smallMultiplier: 1,
  largeMultiplier: 2,
};

function placement(overrides: Partial<PlacementPriceInput> = {}): PlacementPriceInput {
  return {
    locationId: 'branch-1',
    zoneId: 'zone-1',
    locationName: 'Ruaka',
    zoneName: 'Beverages',
    zoneKind: 'department',
    zoneWeeklyRate: null,
    priceTier: 'small',
    rateMultiplier: null,
    ...overrides,
  };
}

function flight(start: string, end: string) {
  return {
    startsAt: new Date(`${start}T00:00:00+03:00`),
    endsAt: new Date(`${end}T23:59:59+03:00`),
  };
}

describe('proximity rate card', () => {
  it('bills a two-week flight at the default section rate and small-branch multiplier', () => {
    const quote = quotePlacements({
      ...flight('2026-10-01', '2026-10-14'),
      card,
      kindRates: [],
      weekIndexes: [],
      placements: [placement()],
    });
    expect(quote.priced).toBe(true);
    expect(quote.billedWeeks).toBe(2);
    expect(quote.weekIndex).toBe(1);
    expect(quote.total).toBe(20000);
  });

  it('rounds a partial week up to one billed week', () => {
    const quote = quotePlacements({
      ...flight('2026-10-01', '2026-10-03'),
      card,
      kindRates: [],
      weekIndexes: [],
      placements: [placement()],
    });
    expect(quote.billedWeeks).toBe(1);
    expect(quote.total).toBe(10000);
  });

  it('prefers a section override, then the kind rate, then the tenant default', () => {
    const dates = flight('2026-10-01', '2026-10-07');
    const shared = { ...dates, card, weekIndexes: [] as [] };
    const override = quotePlacements({
      ...shared,
      kindRates: [{ kind: 'department', weeklyRate: 8000 }],
      placements: [placement({ zoneWeeklyRate: 15000 })],
    });
    const kind = quotePlacements({
      ...shared,
      kindRates: [{ kind: 'checkout', weeklyRate: 18000 }],
      placements: [placement({ zoneKind: 'checkout' })],
    });
    const fallback = quotePlacements({
      ...shared,
      kindRates: [{ kind: 'checkout', weeklyRate: 18000 }],
      placements: [placement()],
    });
    expect(override.lines[0].weeklyRate).toBe(15000);
    expect(kind.lines[0].weeklyRate).toBe(18000);
    expect(fallback.lines[0].weeklyRate).toBe(10000);
  });

  it('uses a branch multiplier override ahead of the large-branch tier', () => {
    const dates = flight('2026-10-01', '2026-10-07');
    const large = quotePlacements({
      ...dates,
      card,
      kindRates: [],
      weekIndexes: [],
      placements: [placement({ priceTier: 'large' })],
    });
    const custom = quotePlacements({
      ...dates,
      card,
      kindRates: [],
      weekIndexes: [],
      placements: [placement({ priceTier: 'large', rateMultiplier: 1.5 })],
    });
    expect(large.total).toBe(20000);
    expect(custom.lines[0].branchMultiplier).toBe(1.5);
    expect(custom.total).toBe(15000);
  });

  it('blends week indexes across the flight and leaves uncovered days at 1', () => {
    const quote = quotePlacements({
      ...flight('2026-10-01', '2026-10-08'),
      card,
      kindRates: [],
      weekIndexes: [{ startsOn: '2026-10-01', endsOn: '2026-10-04', multiplier: 2 }],
      placements: [placement()],
    });
    expect(quote.billedWeeks).toBe(2);
    expect(quote.weekIndex).toBe(1.5);
    expect(quote.total).toBe(30000);
  });

  it('sums each booked product section and stays unpriced when a rate is missing', () => {
    const open = quotePlacements({
      ...flight('2026-10-01', '2026-10-07'),
      card: { ...card, defaultWeeklyRate: null },
      kindRates: [],
      weekIndexes: [],
      placements: [placement(), placement({ zoneId: 'zone-2', zoneName: 'Checkout', zoneWeeklyRate: 5000 })],
    });
    expect(open.priced).toBe(false);
    expect(open.total).toBe(0);
    expect(open.missing).toEqual([{ locationName: 'Ruaka', zoneName: 'Beverages' }]);
  });
});
