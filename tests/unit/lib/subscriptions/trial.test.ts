import { describe, expect, it, vi, afterEach } from 'vitest';
import { getDaysUntil, getTrialDaysRemaining, isInTrialPeriod } from '@/lib/subscriptions/trial';

describe('getTrialDaysRemaining', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when plan has no trial', () => {
    expect(
      getTrialDaysRemaining({
        trialDays: 0,
        startDate: new Date('2026-01-01'),
      }),
    ).toBeNull();
  });

  it('uses start_date and trial_days like dashboard home', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-08T12:00:00Z'));

    expect(
      getTrialDaysRemaining({
        trialDays: 14,
        startDate: new Date('2026-01-01T00:00:00Z'),
      }),
    ).toBe(7);
  });

  it('returns null after trial elapsed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-20T12:00:00Z'));

    expect(
      getTrialDaysRemaining({
        trialDays: 14,
        startDate: new Date('2026-01-01T00:00:00Z'),
      }),
    ).toBeNull();
  });

  it('falls back to expire_date when start_date missing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T12:00:00Z'));

    expect(
      getTrialDaysRemaining({
        trialDays: 14,
        expireDate: new Date('2026-01-15T00:00:00Z'),
      }),
    ).toBe(5);
  });
});

describe('isInTrialPeriod', () => {
  it('is true when days remain', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T12:00:00Z'));

    expect(
      isInTrialPeriod({
        trialDays: 14,
        startDate: new Date('2026-01-01T00:00:00Z'),
      }),
    ).toBe(true);
  });
});

describe('getDaysUntil', () => {
  it('ceil days until future date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    expect(getDaysUntil(new Date('2026-01-03T01:00:00Z'))).toBe(3);
  });
});
