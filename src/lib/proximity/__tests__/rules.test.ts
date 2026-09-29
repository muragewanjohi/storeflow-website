import { PROXIMITY_LOW_BATTERY_MV } from '../constants';
import { pickCreative, splitInvoiceShares, summarizeProximityReports } from '../rules';

const creative = {
  id: 'campaign-1',
  headline: 'Save today',
  body: 'English body',
  headline_sw: 'Okoa leo',
  body_sw: 'Kiswahili',
  headline_b: 'Try this instead',
  body_b: 'Variant B',
  headline_b_sw: 'Jaribu hii',
  body_b_sw: 'Toleo B',
};

describe('proximity commercial and reporting rules', () => {
  it('splits a vendor fee 70/30 without changing the invoice total', () => {
    const shares = splitInvoiceShares(100000, 70);
    expect(shares).toEqual({ supermarketShare: 70000, dukanestShare: 30000 });
    expect(shares.supermarketShare + shares.dukanestShare).toBe(100000);
  });

  it('keeps the full amount with the supermarket when the share is 100', () => {
    expect(splitInvoiceShares(1500, 100)).toEqual({ supermarketShare: 1500, dukanestShare: 0 });
  });

  it('keeps the same A/B variant for one shopper and campaign', () => {
    const first = pickCreative(creative, 'shopper-42', 'en');
    const second = pickCreative(creative, 'shopper-42', 'en');
    expect(second).toEqual(first);
    expect(['a', 'b']).toContain(first.variant);
  });

  it('uses Swahili copy for the assigned variant and falls back to English when it is missing', () => {
    const assigned = pickCreative(creative, 'shopper-42', 'en').variant;
    const swahili = pickCreative(creative, 'shopper-42', 'sw');
    expect(swahili.variant).toBe(assigned);
    expect(swahili.locale).toBe('sw');
    expect(swahili.headline).toBe(assigned === 'b' ? 'Jaribu hii' : 'Okoa leo');

    const englishOnly = pickCreative({ ...creative, headline_sw: null, headline_b_sw: null }, 'shopper-42', 'sw');
    expect(englishOnly.locale).toBe('en');
    expect(englishOnly.headline).toBe(assigned === 'b' ? 'Try this instead' : 'Save today');
  });

  it('counts distinct shoppers and ignores pocket detections as reach', () => {
    const report = summarizeProximityReports({
      locations: [{ id: 'loc-1', name: 'Ruaka Branch' }],
      zones: [{ id: 'zone-1', name: 'Lotions', location_id: 'loc-1', kind: 'department' }],
      events: [
        { location_id: 'loc-1', zone_id: 'zone-1', event_type: 'detected', opaque_customer_id: 'a', impression_on_screen: false },
        { location_id: 'loc-1', zone_id: 'zone-1', event_type: 'detected', opaque_customer_id: 'a', impression_on_screen: false },
        { location_id: 'loc-1', zone_id: 'zone-1', event_type: 'detected', opaque_customer_id: 'b', impression_on_screen: false },
        { location_id: 'loc-1', zone_id: 'zone-1', event_type: 'delivered', opaque_customer_id: 'a', impression_on_screen: false },
        { location_id: 'loc-1', zone_id: 'zone-1', event_type: 'delivered', opaque_customer_id: 'a', impression_on_screen: true },
        { location_id: 'loc-1', zone_id: 'zone-1', event_type: 'clicked', opaque_customer_id: 'a', impression_on_screen: true },
        { location_id: 'loc-1', zone_id: 'zone-1', event_type: 'claimed', opaque_customer_id: 'a', impression_on_screen: true },
      ],
    });

    expect(report.zones).toEqual([
      { zone_id: 'zone-1', zone_name: 'Lotions', branch_name: 'Ruaka Branch', kind: 'department', shoppers: 2 },
    ]);
    expect(report.branches).toEqual([
      { location_id: 'loc-1', name: 'Ruaka Branch', delivered: 1, clicked: 1, claimed: 1 },
    ]);
    expect(JSON.stringify({ zones: report.zones, branches: report.branches })).not.toMatch(/"a"|"b"/);
  });

  it('still lists a branch that has no events', () => {
    const report = summarizeProximityReports({
      locations: [{ id: 'loc-1', name: 'Ruaka Branch' }],
      zones: [],
      events: [],
    });
    expect(report.branches[0]).toMatchObject({ name: 'Ruaka Branch', delivered: 0, clicked: 0, claimed: 0 });
    expect(report.zones).toEqual([]);
  });

  it('treats battery readings below 2400 mV as a cell replacement', () => {
    expect(PROXIMITY_LOW_BATTERY_MV).toBe(2400);
    expect(2399 < PROXIMITY_LOW_BATTERY_MV).toBe(true);
    expect(2400 < PROXIMITY_LOW_BATTERY_MV).toBe(false);
  });
});
