import {
  DEFAULT_ONBOARDING_REWARD_BONUS_DAYS,
  DEFAULT_ONBOARDING_REWARD_WINDOW_DAYS,
  getOnboardingRewardWindowStatus,
  resolveOnboardingRewardConfig,
} from '@/lib/onboarding/onboarding-reward';

jest.mock('@/lib/prisma/client', () => ({
  prisma: {},
}));

jest.mock('@/lib/email/service', () => ({
  sendPlatformEmail: jest.fn(),
}));

describe('onboarding-reward window', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-19T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('is eligible within configured window days of start_date', () => {
    const startDate = new Date('2026-05-01T00:00:00.000Z');
    const status = getOnboardingRewardWindowStatus(startDate, 30);

    expect(status.eligible).toBe(true);
    expect(status.daysRemainingInWindow).toBeGreaterThan(0);
    expect(status.eligibleUntil).toBeTruthy();
  });

  it('is not eligible after the configured window', () => {
    const startDate = new Date('2026-03-01T00:00:00.000Z');
    const status = getOnboardingRewardWindowStatus(startDate, 30);

    expect(status.eligible).toBe(false);
    expect(status.daysRemainingInWindow).toBe(0);
  });

  it('is disabled when window days is zero', () => {
    const startDate = new Date('2026-05-01T00:00:00.000Z');
    const status = getOnboardingRewardWindowStatus(startDate, 0);

    expect(status.eligible).toBe(false);
  });

  it('resolves plan reward config with defaults', () => {
    expect(resolveOnboardingRewardConfig(null)).toEqual({
      enabled: true,
      windowDays: 30,
      bonusDays: 30,
    });
  });

  it('disables reward when plan window or bonus is zero', () => {
    expect(
      resolveOnboardingRewardConfig({
        onboarding_reward_window_days: 0,
        onboarding_reward_bonus_days: 30,
      }),
    ).toEqual({ enabled: false, windowDays: 0, bonusDays: 0 });

    expect(
      resolveOnboardingRewardConfig({
        onboarding_reward_window_days: 30,
        onboarding_reward_bonus_days: 0,
      }),
    ).toEqual({ enabled: false, windowDays: 0, bonusDays: 0 });
  });

  it('exports stable reward defaults', () => {
    expect(DEFAULT_ONBOARDING_REWARD_WINDOW_DAYS).toBe(30);
    expect(DEFAULT_ONBOARDING_REWARD_BONUS_DAYS).toBe(30);
  });
});
