import { isAllowedCp35Tx } from '../constants';
import { generateClaimCode, secretsEqual } from '../tokens';
import {
  beaconInputSchema,
  campaignInputSchema,
  campaignPriority,
  eventInputSchema,
  locationInputSchema,
  newSdkKey,
} from '../validation';

const locationId = '11111111-1111-4111-8111-111111111111';
const zoneId = '22222222-2222-4222-8222-222222222222';

function campaign(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Wednesday offer',
    headline: 'Save today',
    starts_at: '2026-09-01T00:00:00+03:00',
    ends_at: '2026-09-30T21:00:00+03:00',
    placements: [{ location_id: locationId, zone_id: zoneId }],
    ...overrides,
  };
}

describe('proximity input validation', () => {
  it('accepts a branch geofence and rejects coordinates or radii outside the store range', () => {
    expect(
      locationInputSchema.safeParse({
        name: 'Ruaka Branch',
        latitude: -1.208,
        longitude: 36.78,
        geofence_radius_m: 150,
      }).success
    ).toBe(true);
    expect(locationInputSchema.safeParse({ name: 'Ruaka', latitude: 91, longitude: 36 }).success).toBe(false);
    expect(locationInputSchema.safeParse({ name: 'Ruaka', geofence_radius_m: 29 }).success).toBe(false);
    expect(locationInputSchema.safeParse({ name: 'Ruaka', geofence_radius_m: 2001 }).success).toBe(false);
  });

  it('accepts phase 2 campaign fields and rejects a malformed schedule', () => {
    const accepted = campaignInputSchema.safeParse(
      campaign({
        purpose: 'thank_you',
        days_of_week: '12345',
        headline_sw: 'Asante',
        body_sw: 'Karibu tena',
        headline_b: 'Alternate',
        fee_amount: 100000,
        supermarket_share_pct: 70,
      })
    );
    expect(accepted.success).toBe(true);
    expect(campaignInputSchema.safeParse(campaign({ purpose: 'auction' })).success).toBe(false);
    expect(campaignInputSchema.safeParse(campaign({ days_of_week: '7' })).success).toBe(false);
    expect(campaignInputSchema.safeParse(campaign({ trading_hours_start: '0800' })).success).toBe(false);
    expect(campaignInputSchema.safeParse(campaign({ placements: [] })).success).toBe(false);
  });

  it('accepts a geofence event with battery voltage and rejects an out-of-range cell reading', () => {
    const accepted = eventInputSchema.safeParse({
      opaque_customer_id: 'shopper-1',
      event_type: 'detected',
      source: 'geofence',
      consent: true,
      battery_mv: 2300,
      locale: 'sw',
    });
    expect(accepted.success).toBe(true);
    expect(
      eventInputSchema.safeParse({
        opaque_customer_id: 'shopper-1',
        event_type: 'detected',
        consent: true,
        battery_mv: 5001,
      }).success
    ).toBe(false);
  });

  it('only allows the CP35 transmit steps and ranks vendor campaigns above house', () => {
    expect(isAllowedCp35Tx(-13.5)).toBe(true);
    expect(isAllowedCp35Tx(-12)).toBe(false);
    expect(beaconInputSchema.safeParse({ location_id: locationId, zone_id: zoneId, major: 1, minor: 2 }).success).toBe(true);
    expect(campaignPriority('advertiser-1')).toBeGreaterThan(campaignPriority(null));
  });

  it('issues scan keys and claim codes that can be checked later', () => {
    const key = newSdkKey('scan');
    expect(key.token.startsWith('dn_scan_')).toBe(true);
    expect(secretsEqual(key.token, key.hash)).toBe(true);
    expect(generateClaimCode('New test')).toMatch(/^NEWTES-[A-F0-9]{6}$/);
  });
});
