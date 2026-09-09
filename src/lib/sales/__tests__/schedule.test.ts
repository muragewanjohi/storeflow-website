import { isSaleLiveAt, startOfUtcDay, endOfUtcDay } from '@/lib/sales/schedule';

describe('isSaleLiveAt', () => {
  it('treats a same-day start stamped hours ahead (timezone-naive) as live', () => {
    // Kenya ~11:51 local saved without offset → stored/parsed as 11:51 UTC
    const start = new Date('2026-09-09T11:51:00.000Z');
    const now = new Date('2026-09-09T08:51:00.000Z'); // actual UTC when it was 11:51+03
    expect(isSaleLiveAt(now, start, new Date('2026-09-16T00:00:00.000Z'))).toBe(true);
  });

  it('keeps a future calendar-day start hidden', () => {
    const now = new Date('2026-09-09T12:00:00.000Z');
    const start = new Date('2026-09-10T00:00:00.000Z');
    expect(isSaleLiveAt(now, start, null)).toBe(false);
  });

  it('keeps an end-date midnight inclusive through that UTC day', () => {
    const end = new Date('2026-09-16T00:00:00.000Z');
    expect(isSaleLiveAt(new Date('2026-09-16T18:00:00.000Z'), null, end)).toBe(true);
    expect(isSaleLiveAt(new Date('2026-09-17T00:00:01.000Z'), null, end)).toBe(false);
  });

  it('handles null dates as open-ended', () => {
    const now = new Date('2026-09-09T12:00:00.000Z');
    expect(isSaleLiveAt(now, null, null)).toBe(true);
  });
});

describe('utc day helpers', () => {
  it('startOfUtcDay / endOfUtcDay bound the calendar day', () => {
    const d = new Date('2026-09-09T15:30:00.000Z');
    expect(startOfUtcDay(d).toISOString()).toBe('2026-09-09T00:00:00.000Z');
    expect(endOfUtcDay(d).toISOString()).toBe('2026-09-09T23:59:59.999Z');
  });
});
