import { buildProximityOverview, overviewWindow } from '../overview';

const now = new Date('2026-10-06T07:00:00.000Z');

const locations = [
  { id: 'westlands', name: 'Westlands' },
  { id: 'karen', name: 'Karen' },
];

function event(overrides: Partial<{
  created_at: string;
  location_id: string | null;
  campaign_id: string | null;
  event_type: string;
  opaque_customer_id: string;
  impression_on_screen: boolean;
}> = {}) {
  return {
    created_at: '2026-10-02T08:00:00.000Z',
    location_id: 'westlands',
    campaign_id: 'coke',
    event_type: 'detected',
    opaque_customer_id: 'shopper-a',
    impression_on_screen: false,
    ...overrides,
  };
}

describe('proximity overview cockpit', () => {
  it('opens this month at Nairobi midnight and compares an equal earlier span', () => {
    const window = overviewWindow('this_month', now);
    expect(window.start.toISOString()).toBe('2026-09-30T21:00:00.000Z');
    expect(window.label).toBe('This month');
    expect(window.previousEnd.toISOString()).toBe(window.start.toISOString());
    expect(window.end.getTime() - window.start.getTime()).toBe(
      window.previousEnd.getTime() - window.previousStart.getTime()
    );
  });

  it('counts on-screen cards separately from pocket detections and compares the previous span', () => {
    const overview = buildProximityOverview({
      now,
      range: 'this_month',
      locationId: null,
      locations,
      campaigns: [
        {
          id: 'coke',
          name: 'Coca-Cola Weekend',
          status: 'live',
          starts_at: '2026-10-01T06:00:00.000Z',
          ends_at: '2026-10-20T06:00:00.000Z',
          updated_at: '2026-10-05T06:00:00.000Z',
          advertiser_name: 'Coca-Cola',
          location_ids: ['westlands'],
        },
      ],
      beacons: [],
      invoices: [],
      claims: [],
      events: [
        event(),
        event({ opaque_customer_id: 'shopper-a' }),
        event({ opaque_customer_id: 'shopper-b' }),
        event({ event_type: 'delivered', impression_on_screen: false }),
        event({ event_type: 'delivered', impression_on_screen: true }),
        event({ event_type: 'delivered', impression_on_screen: true, opaque_customer_id: 'shopper-b' }),
        event({ event_type: 'clicked' }),
        event({ event_type: 'claimed' }),
        event({
          created_at: '2026-09-28T08:00:00.000Z',
          event_type: 'delivered',
          impression_on_screen: true,
        }),
      ],
    });

    const onScreen = overview.kpis.find((item) => item.key === 'on_screen');
    const detected = overview.kpis.find((item) => item.key === 'detected');
    expect(detected).toMatchObject({ value: 3, previous: 0, delta_pct: null });
    expect(onScreen).toMatchObject({ value: 2, previous: 1, delta_pct: 100 });
    expect(overview.funnel.map((step) => [step.key, step.value])).toEqual([
      ['reached', 2],
      ['on_screen', 2],
      ['claimed', 1],
      ['redeemed', 0],
    ]);
    expect(overview.campaigns[0]).toMatchObject({
      name: 'Coca-Cola Weekend',
      brand: 'Coca-Cola',
      on_screen: 2,
      claims: 1,
    });
    expect(overview.stats.note).toMatch(/not ROAS/);
  });

  it('keeps a redemption in the funnel and the activity feed without turning it into a sale', () => {
    const overview = buildProximityOverview({
      now,
      range: 'this_month',
      locationId: 'westlands',
      locations,
      campaigns: [],
      beacons: [],
      invoices: [],
      events: [event({ event_type: 'claimed', impression_on_screen: true })],
      claims: [
        {
          opaque_customer_id: 'shopper-a',
          claimed_at: '2026-10-02T08:00:00.000Z',
          redeemed_at: '2026-10-03T09:00:00.000Z',
          campaign_name: 'Coca-Cola Weekend',
          location_ids: ['westlands'],
        },
      ],
    });

    expect(overview.funnel.find((step) => step.key === 'redeemed')?.value).toBe(1);
    expect(overview.activity[0]).toMatchObject({
      title: 'Coupon redeemed · Coca-Cola Weekend',
      branch: 'Westlands',
      tone: 'completed',
    });
    expect(JSON.stringify(overview)).not.toMatch(/attributed|purchasing/i);
  });

  it('attributes invoice money only when a campaign belongs to one branch', () => {
    const invoices = [
      {
        id: 'inv-1',
        amount: 100000,
        supermarket_share: 70000,
        dukanest_share: 30000,
        status: 'paid',
        created_at: '2026-10-04T08:00:00.000Z',
        campaign_name: 'Coca-Cola Weekend',
        location_ids: ['westlands'],
      },
      {
        id: 'inv-2',
        amount: 50000,
        supermarket_share: 35000,
        dukanest_share: 15000,
        status: 'issued',
        created_at: '2026-10-04T10:00:00.000Z',
        campaign_name: 'Chain buy',
        location_ids: ['westlands', 'karen'],
      },
      {
        id: 'inv-3',
        amount: 10000,
        supermarket_share: 7000,
        dukanest_share: 3000,
        status: 'draft',
        created_at: '2026-10-04T11:00:00.000Z',
        campaign_name: 'Draft',
        location_ids: ['westlands'],
      },
    ];

    const all = buildProximityOverview({
      now,
      range: 'this_month',
      locationId: null,
      locations,
      campaigns: [],
      beacons: [],
      events: [],
      claims: [],
      invoices,
    });
    expect(all.revenue).toMatchObject({
      gross: 150000,
      supermarket_share: 105000,
      dukanest_share: 45000,
      supermarket_pct: 70,
      dukanest_pct: 30,
    });
    expect(all.branches.find((branch) => branch.location_id === 'westlands')?.ad_revenue).toBe(70000);
    expect(all.branches.find((branch) => branch.location_id === 'karen')?.ad_revenue).toBe(0);

    const westlands = buildProximityOverview({
      now,
      range: 'this_month',
      locationId: 'westlands',
      locations,
      campaigns: [],
      beacons: [],
      events: [],
      claims: [],
      invoices,
    });
    expect(westlands.revenue.gross).toBe(100000);
    expect(westlands.revenue.omitted_shared_invoices).toBe(1);
  });

  it('reports beacon health as reporting over the active fleet and flags a low cell', () => {
    const overview = buildProximityOverview({
      now,
      range: 'today',
      locationId: null,
      locations,
      campaigns: [],
      events: [],
      invoices: [],
      claims: [],
      beacons: [
        {
          id: 'ok',
          location_id: 'westlands',
          location_name: 'Westlands',
          zone_id: 'entrance',
          zone_name: 'Entrance',
          name: 'CP35-001',
          status: 'active',
          last_seen_at: '2026-10-06T06:30:00.000Z',
          battery_mv: 3000,
          created_at: '2026-09-01T00:00:00.000Z',
        },
        {
          id: 'low',
          location_id: 'westlands',
          location_name: 'Westlands',
          zone_id: 'beauty',
          zone_name: 'Beauty',
          name: 'CP35-004',
          status: 'active',
          last_seen_at: '2026-10-06T06:40:00.000Z',
          battery_mv: 2100,
          created_at: '2026-09-01T00:00:00.000Z',
        },
        {
          id: 'dark',
          location_id: 'karen',
          location_name: 'Karen',
          zone_id: 'bev',
          zone_name: 'Beverages',
          name: 'CP35-009',
          status: 'active',
          last_seen_at: '2026-10-04T06:00:00.000Z',
          battery_mv: 3000,
          created_at: '2026-09-01T00:00:00.000Z',
        },
      ],
    });

    expect(overview.beacon_health).toMatchObject({ online: 1, low_battery: 1, offline: 1, reporting: 2, total: 3 });
    expect(overview.system).toEqual({
      tone: 'attention',
      label: '1 beacon needs attention',
      beacon_ids: ['dark'],
    });
    expect(overview.zones.find((zone) => zone.zone_name === 'Beauty')?.low_battery).toBe(1);
    expect(overview.activity.some((item) => item.title === 'CP35-004 battery low')).toBe(true);
    expect(overview.dark_beacons.map((beacon) => beacon.id)).toEqual(['dark']);
  });

  it('scopes live campaigns and branch rows to the selected branch without dropping the comparison table', () => {
    const overview = buildProximityOverview({
      now,
      range: 'this_month',
      locationId: 'karen',
      locations,
      beacons: [],
      invoices: [],
      claims: [],
      campaigns: [
        {
          id: 'coke',
          name: 'Coca-Cola Weekend',
          status: 'live',
          starts_at: '2026-10-02T06:00:00.000Z',
          ends_at: '2026-10-20T06:00:00.000Z',
          updated_at: '2026-10-02T06:00:00.000Z',
          advertiser_name: null,
          location_ids: ['westlands'],
        },
        {
          id: 'house',
          name: 'House welcome',
          status: 'scheduled',
          starts_at: '2026-10-03T06:00:00.000Z',
          ends_at: '2026-10-30T06:00:00.000Z',
          updated_at: '2026-10-03T06:00:00.000Z',
          advertiser_name: null,
          location_ids: ['karen'],
        },
      ],
      events: [
        event({ location_id: 'karen', campaign_id: 'house', event_type: 'delivered', impression_on_screen: true }),
      ],
    });

    expect(overview.live_campaigns).toBe(1);
    expect(overview.kpis.find((item) => item.key === 'live_campaigns')).toMatchObject({ value: 1, started: 1 });
    expect(overview.campaigns[0]).toMatchObject({ brand: 'House', on_screen: 1 });
    expect(overview.branches.map((branch) => branch.name)).toEqual(['Karen', 'Westlands']);
  });
});
