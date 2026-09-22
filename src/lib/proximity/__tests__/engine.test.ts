import { HOUSE_CAMPAIGN_PRIORITY, VENDOR_CAMPAIGN_PRIORITY } from '../constants';
import { isDarkSlot, isLiveStatus, placementsOverlap, selectCampaign, slugify } from '../engine';

describe('selectCampaign', () => {
  const now = new Date('2026-09-22T10:00:00+03:00');
  const base = {
    status: 'live',
    startsAt: new Date('2026-09-01T00:00:00+03:00'),
    endsAt: new Date('2026-09-30T23:59:00+03:00'),
    timezone: 'Africa/Nairobi',
    tradingHoursStart: '08:00',
    tradingHoursEnd: '21:00',
    frequencyCapPerDay: 1,
    visitStormCap: 3,
    dwellMs: 2500,
    billingPaused: false,
    locationId: 'loc-1',
    zoneId: 'zone-1',
  };

  const vendor = {
    ...base,
    id: 'vendor-1',
    advertiserId: 'adv-1',
    priority: VENDOR_CAMPAIGN_PRIORITY,
  };

  const house = {
    ...base,
    id: 'house-1',
    advertiserId: null,
    priority: HOUSE_CAMPAIGN_PRIORITY,
  };

  it('requires consent', () => {
    const decision = selectCampaign({
      now,
      consent: false,
      source: 'ble',
      dwellElapsedMs: 4000,
      deliveredTodayByCampaign: {},
      deliveredThisVisit: 0,
      campaigns: [vendor],
    });
    expect(decision.action).toBe('none');
    if (decision.action === 'none') expect(decision.reason).toBe('consent_required');
  });

  it('prefers a live vendor campaign over house so paid slots are not overwritten', () => {
    const decision = selectCampaign({
      now,
      consent: true,
      source: 'ble',
      dwellElapsedMs: 4000,
      deliveredTodayByCampaign: {},
      deliveredThisVisit: 0,
      campaigns: [house, vendor],
    });
    expect(decision.action).toBe('eligible');
    if (decision.action === 'eligible') {
      expect(decision.kind).toBe('vendor');
      expect(decision.campaign.id).toBe('vendor-1');
    }
  });

  it('falls back to house when vendor is frequency-capped for this customer today', () => {
    const decision = selectCampaign({
      now,
      consent: true,
      source: 'ble',
      dwellElapsedMs: 4000,
      deliveredTodayByCampaign: { 'vendor-1': 1 },
      deliveredThisVisit: 0,
      campaigns: [house, vendor],
    });
    expect(decision.action).toBe('eligible');
    if (decision.action === 'eligible') expect(decision.kind).toBe('house');
  });

  it('waits for dwell on BLE but not QR', () => {
    const ble = selectCampaign({
      now,
      consent: true,
      source: 'ble',
      dwellElapsedMs: 500,
      deliveredTodayByCampaign: {},
      deliveredThisVisit: 0,
      campaigns: [vendor],
    });
    expect(ble.action).toBe('none');

    const qr = selectCampaign({
      now,
      consent: true,
      source: 'qr',
      dwellElapsedMs: 0,
      deliveredTodayByCampaign: {},
      deliveredThisVisit: 0,
      campaigns: [vendor],
    });
    expect(qr.action).toBe('eligible');
  });

  it('respects Nairobi trading hours', () => {
    const night = new Date('2026-09-22T22:30:00+03:00');
    const decision = selectCampaign({
      now: night,
      consent: true,
      source: 'qr',
      dwellElapsedMs: 0,
      deliveredTodayByCampaign: {},
      deliveredThisVisit: 0,
      campaigns: [vendor],
    });
    expect(decision.action).toBe('none');
  });

  it('enforces a visit-level storm cap before another card', () => {
    const decision = selectCampaign({
      now,
      consent: true,
      source: 'ble',
      dwellElapsedMs: 4000,
      deliveredTodayByCampaign: {},
      deliveredThisVisit: 3,
      campaigns: [vendor, house],
    });
    expect(decision.action).toBe('none');
    if (decision.action === 'none') expect(decision.reason).toBe('frequency_or_storm_capped');
  });
});

describe('helpers', () => {
  it('detects overlapping placements', () => {
    expect(
      placementsOverlap(
        {
          locationId: 'a',
          zoneId: 'z',
          startsAt: new Date('2026-09-01'),
          endsAt: new Date('2026-09-10'),
        },
        {
          locationId: 'a',
          zoneId: 'z',
          startsAt: new Date('2026-09-08'),
          endsAt: new Date('2026-09-20'),
        }
      )
    ).toBe(true);
  });

  it('treats approved campaigns inside the window as live', () => {
    const now = new Date('2026-09-22T10:00:00Z');
    expect(
      isLiveStatus('approved', now, new Date('2026-09-01T00:00:00Z'), new Date('2026-09-30T00:00:00Z'))
    ).toBe(true);
    expect(
      isLiveStatus('draft', now, new Date('2026-09-01T00:00:00Z'), new Date('2026-09-30T00:00:00Z'))
    ).toBe(false);
  });

  it('slugifies branch names', () => {
    expect(slugify('Westlands Branch')).toBe('westlands-branch');
  });

  it('marks a beacon dark after 24h without last-seen', () => {
    const now = new Date('2026-09-22T10:00:00Z');
    expect(isDarkSlot(new Date('2026-09-20T09:00:00Z'), now)).toBe(true);
    expect(isDarkSlot(new Date('2026-09-22T09:00:00Z'), now)).toBe(false);
    expect(isDarkSlot(null, now)).toBe(true);
  });
});
