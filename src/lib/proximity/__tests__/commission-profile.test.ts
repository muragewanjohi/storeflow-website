import { commissionUpdate } from '../commission-profile';

const existing = {
  major: 1,
  minor: 2,
  tx_power_dbm: -13.5,
  adv_interval_ms: 500,
  battery_mv: null as number | null,
};

describe('commissionUpdate', () => {
  it('keeps the registered slot and records battery', () => {
    const now = new Date('2026-09-28T12:00:00.000Z');
    const update = commissionUpdate(existing, { battery_mv: 2500 }, now);
    expect(update.major).toBe(1);
    expect(update.minor).toBe(2);
    expect(update.battery_mv).toBe(2500);
    expect(update.ibeacon_uuid).toBe('6e8a4c12-9f3d-4b71-a2e8-1d7c0b5e4a91');
    expect(update.last_seen_at).toEqual(now);
  });

  it('rejects a transmit power the CP35 cannot set', () => {
    expect(() => commissionUpdate(existing, { tx_power_dbm: -12 })).toThrow(/TX must be one of/);
  });
});
