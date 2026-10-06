import { PROXIMITY_DARK_SLOT_MS, PROXIMITY_LOW_BATTERY_MV } from './constants';

/** Nairobi is UTC+3 year-round. Windows are calendar-aware without a timezone library. */
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_WINDOW_MS = 30 * DAY_MS;

export const OVERVIEW_RANGES = ['today', 'last_7_days', 'this_month', 'last_30_days'] as const;
export type OverviewRange = (typeof OVERVIEW_RANGES)[number];

export function isOverviewRange(value: string | null | undefined): value is OverviewRange {
  return (OVERVIEW_RANGES as readonly string[]).includes(value || '');
}

export type OverviewWindow = {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  label: string;
  comparisonLabel: string;
};

export function overviewWindow(range: OverviewRange, now: Date): OverviewWindow {
  const end = now;
  if (range === 'today') {
    const start = nairobiStartOfDay(now);
    return equalWindow(start, end, 'Today', 'vs yesterday');
  }
  if (range === 'last_7_days') {
    const start = new Date(end.getTime() - 7 * DAY_MS);
    return equalWindow(start, end, 'Last 7 days', 'vs prior 7 days');
  }
  if (range === 'last_30_days') {
    const start = new Date(end.getTime() - 30 * DAY_MS);
    return equalWindow(start, end, 'Last 30 days', 'vs prior 30 days');
  }
  const parts = nairobiParts(now);
  const start = nairobiDate(parts.year, parts.month, 1);
  return equalWindow(start, end, 'This month', 'vs prior period');
}

function equalWindow(start: Date, end: Date, label: string, comparisonLabel: string): OverviewWindow {
  const duration = Math.max(end.getTime() - start.getTime(), 0);
  return {
    start,
    end,
    previousStart: new Date(start.getTime() - duration),
    previousEnd: start,
    label,
    comparisonLabel,
  };
}

function nairobiParts(date: Date) {
  const shifted = new Date(date.getTime() + NAIROBI_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

function nairobiDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day) - NAIROBI_OFFSET_MS);
}

function nairobiStartOfDay(date: Date) {
  const parts = nairobiParts(date);
  return nairobiDate(parts.year, parts.month, parts.day);
}

function nairobiDayKey(date: Date) {
  const parts = nairobiParts(date);
  return `${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function eachNairobiDay(start: Date, end: Date) {
  const days: string[] = [];
  let cursor = nairobiStartOfDay(start).getTime();
  const last = nairobiStartOfDay(end).getTime();
  while (cursor <= last && days.length < 62) {
    days.push(nairobiDayKey(new Date(cursor)));
    cursor += DAY_MS;
  }
  return days;
}

export type OverviewEvent = {
  created_at: string;
  location_id: string | null;
  campaign_id: string | null;
  event_type: string;
  opaque_customer_id: string;
  impression_on_screen: boolean;
};

export type OverviewCampaign = {
  id: string;
  name: string;
  status: string;
  starts_at: string;
  ends_at: string;
  updated_at: string | null;
  advertiser_name: string | null;
  location_ids: string[];
};

export type OverviewBeacon = {
  id: string;
  location_id: string;
  location_name: string;
  zone_id: string;
  zone_name: string;
  name: string | null;
  status: string;
  last_seen_at: string | null;
  battery_mv: number | null;
  created_at: string | null;
};

export type OverviewInvoice = {
  id: string;
  amount: number;
  supermarket_share: number;
  dukanest_share: number;
  status: string;
  created_at: string;
  campaign_name: string | null;
  location_ids: string[];
};

export type OverviewClaim = {
  opaque_customer_id: string;
  claimed_at: string | null;
  redeemed_at: string | null;
  campaign_name: string | null;
  location_ids: string[];
};

export type OverviewLocation = { id: string; name: string };

type BeaconTone = 'online' | 'low_battery' | 'offline';
type ActivityTone = 'active' | 'attention' | 'completed' | 'scheduled';

const ACTIVE_STATUSES = ['approved', 'live', 'scheduled'];
const COUNTED_INVOICE_STATUSES = ['issued', 'paid'];

export type ProximityOverview = ReturnType<typeof buildProximityOverview>;

export function buildProximityOverview(input: {
  now: Date;
  range: OverviewRange;
  locationId: string | null;
  locations: OverviewLocation[];
  events: OverviewEvent[];
  campaigns: OverviewCampaign[];
  beacons: OverviewBeacon[];
  invoices: OverviewInvoice[];
  claims: OverviewClaim[];
}) {
  const window = overviewWindow(input.range, input.now);
  const locationId = input.locationId;
  const locationName = new Map(input.locations.map((location) => [location.id, location.name]));
  const inScope = (ids: Array<string | null | undefined>) =>
    !locationId || ids.some((id) => id === locationId);

  const currentEvents = input.events.filter(
    (event) => inCurrent(event.created_at, window) && (!locationId || event.location_id === locationId)
  );
  const previousEvents = input.events.filter(
    (event) => inPrevious(event.created_at, window) && (!locationId || event.location_id === locationId)
  );

  const currentCounts = countEvents(currentEvents);
  const previousCounts = countEvents(previousEvents);
  const activeCampaigns = input.campaigns.filter(
    (campaign) => ACTIVE_STATUSES.includes(campaign.status) && inScope(campaign.location_ids)
  );
  const started = activeCampaigns.filter((campaign) => inCurrent(campaign.starts_at, window)).length;

  const scopedBeacons = input.beacons.filter(
    (beacon) => beacon.status === 'active' && (!locationId || beacon.location_id === locationId)
  );
  const beaconHealth = { online: 0, low_battery: 0, offline: 0, total: scopedBeacons.length };
  const zoneBuckets = new Map<
    string,
    { zone_id: string; zone_name: string; branch_name: string; online: number; low_battery: number; offline: number }
  >();
  const darkBeacons: Array<{
    id: string;
    location: { name: string };
    zone: { name: string };
    last_seen_at: string | null;
  }> = [];
  const lowBatteryIds: string[] = [];

  for (const beacon of scopedBeacons) {
    const tone = beaconTone(beacon, input.now);
    beaconHealth[tone] += 1;
    const zone = zoneBuckets.get(beacon.zone_id) || {
      zone_id: beacon.zone_id,
      zone_name: beacon.zone_name,
      branch_name: beacon.location_name,
      online: 0,
      low_battery: 0,
      offline: 0,
    };
    zone[tone] += 1;
    zoneBuckets.set(beacon.zone_id, zone);
    if (tone === 'offline') {
      darkBeacons.push({
        id: beacon.id,
        location: { name: beacon.location_name },
        zone: { name: beacon.zone_name },
        last_seen_at: beacon.last_seen_at,
      });
    }
    if (tone === 'low_battery') lowBatteryIds.push(beacon.id);
  }

  const funnel = buildFunnel(currentEvents, input.claims, window, locationId);
  const campaigns = rankCampaigns(currentEvents, input.campaigns);
  const branches = rankBranches(input.locations, input.events, input.invoices, window);
  const revenue = buildRevenue(input.invoices, window, locationId);
  const activity = buildActivity(input, locationId, locationName);

  const reporting = beaconHealth.online + beaconHealth.low_battery;
  const attentionBeaconIds = darkBeacons.length > 0 ? darkBeacons.map((beacon) => beacon.id) : lowBatteryIds;
  const system =
    beaconHealth.offline > 0
      ? { tone: 'attention' as const, label: beaconAttention(beaconHealth.offline, 'offline'), beacon_ids: attentionBeaconIds }
      : beaconHealth.low_battery > 0
        ? { tone: 'attention' as const, label: beaconAttention(beaconHealth.low_battery, 'low'), beacon_ids: attentionBeaconIds }
        : { tone: 'ok' as const, label: 'All systems operational', beacon_ids: [] as string[] };

  return {
    range: input.range,
    location_id: locationId,
    period_label: window.label,
    comparison_label: window.comparisonLabel,
    locations: input.locations.map((location) => ({ id: location.id, name: location.name })),
    live_campaigns: activeCampaigns.length,
    stats: {
      detected: currentCounts.detected,
      delivered: currentCounts.on_screen,
      clicked: currentCounts.clicked,
      claimed: currentCounts.claimed,
      ctr: currentCounts.on_screen ? currentCounts.clicked / currentCounts.on_screen : 0,
      note: 'Impressions are on-screen cards only. Till purchases without a claim are not measured. This is not ROAS.',
    },
    kpis: [
      kpi('live_campaigns', 'Live campaigns', activeCampaigns.length, 0, started),
      kpi('detected', 'Zone detections', currentCounts.detected, previousCounts.detected, null),
      kpi('on_screen', 'On-screen views', currentCounts.on_screen, previousCounts.on_screen, null),
      kpi('clicked', 'Clicks', currentCounts.clicked, previousCounts.clicked, null),
      kpi('claimed', 'Claims', currentCounts.claimed, previousCounts.claimed, null),
    ],
    beacon_health: { ...beaconHealth, reporting },
    system,
    dark_beacons: darkBeacons,
    funnel,
    campaigns,
    branches,
    revenue,
    zones: [...zoneBuckets.values()].sort((a, b) => b.offline - a.offline || b.low_battery - a.low_battery || a.zone_name.localeCompare(b.zone_name)),
    activity,
  };
}

function beaconAttention(count: number, kind: 'offline' | 'low') {
  const noun = count === 1 ? 'beacon' : 'beacons';
  if (kind === 'offline') return `${count} ${noun} ${count === 1 ? 'needs' : 'need'} attention`;
  return `${count} ${noun} low on battery`;
}

function kpi(key: string, label: string, value: number, previous: number, started: number | null) {
  return {
    key,
    label,
    value,
    previous,
    delta_pct: started === null ? percentDelta(value, previous) : null,
    started,
  };
}

function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function countEvents(events: OverviewEvent[]) {
  const counts = { detected: 0, on_screen: 0, clicked: 0, claimed: 0 };
  for (const event of events) {
    if (event.event_type === 'detected') counts.detected += 1;
    if (event.event_type === 'delivered' && event.impression_on_screen) counts.on_screen += 1;
    if (event.event_type === 'clicked') counts.clicked += 1;
    if (event.event_type === 'claimed') counts.claimed += 1;
  }
  return counts;
}

function buildFunnel(
  events: OverviewEvent[],
  claims: OverviewClaim[],
  window: OverviewWindow,
  locationId: string | null
) {
  const reached = new Set<string>();
  const onScreen = new Set<string>();
  const claimed = new Set<string>();
  for (const event of events) {
    if (event.event_type === 'detected') reached.add(event.opaque_customer_id);
    if (event.event_type === 'delivered' && event.impression_on_screen) onScreen.add(event.opaque_customer_id);
    if (event.event_type === 'claimed') claimed.add(event.opaque_customer_id);
  }
  const redeemed = new Set<string>();
  for (const claim of claims) {
    if (!claim.redeemed_at || !inCurrent(claim.redeemed_at, window)) continue;
    if (locationId && !claim.location_ids.includes(locationId)) continue;
    redeemed.add(claim.opaque_customer_id);
  }
  const steps = [
    { key: 'reached', label: 'Reached', value: reached.size },
    { key: 'on_screen', label: 'On screen', value: onScreen.size },
    { key: 'claimed', label: 'Claimed', value: claimed.size },
    { key: 'redeemed', label: 'Redeemed', value: redeemed.size },
  ];
  const base = steps[0].value;
  return steps.map((step, index) => {
    const prior = index === 0 ? step.value : steps[index - 1].value;
    return {
      ...step,
      share_pct: base ? Math.round((step.value / base) * 1000) / 10 : 0,
      step_pct: prior ? Math.round((step.value / prior) * 1000) / 10 : 0,
    };
  });
}

function rankCampaigns(events: OverviewEvent[], campaigns: OverviewCampaign[]) {
  const byId = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const buckets = new Map<string, { on_screen: number; claims: number }>();
  for (const event of events) {
    if (!event.campaign_id) continue;
    const onScreen = event.event_type === 'delivered' && event.impression_on_screen;
    const claimed = event.event_type === 'claimed';
    if (!onScreen && !claimed) continue;
    const bucket = buckets.get(event.campaign_id) || { on_screen: 0, claims: 0 };
    if (onScreen) bucket.on_screen += 1;
    if (claimed) bucket.claims += 1;
    buckets.set(event.campaign_id, bucket);
  }
  const ranked = [...buckets.entries()]
    .map(([id, counts]) => {
      const campaign = byId.get(id);
      return {
        id,
        name: campaign?.name || 'Campaign',
        brand: campaign?.advertiser_name || 'House',
        starts_at: campaign?.starts_at || null,
        ends_at: campaign?.ends_at || null,
        on_screen: counts.on_screen,
        claims: counts.claims,
      };
    })
    .sort((a, b) => b.on_screen - a.on_screen || b.claims - a.claims);

  if (ranked.length > 0) return ranked.slice(0, 5);

  return campaigns
    .filter((campaign) => ACTIVE_STATUSES.includes(campaign.status))
    .slice(0, 5)
    .map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      brand: campaign.advertiser_name || 'House',
      starts_at: campaign.starts_at,
      ends_at: campaign.ends_at,
      on_screen: 0,
      claims: 0,
    }));
}

function rankBranches(
  locations: OverviewLocation[],
  events: OverviewEvent[],
  invoices: OverviewInvoice[],
  window: OverviewWindow
) {
  const current = new Map<string, { on_screen: number; claims: number }>();
  const previous = new Map<string, { on_screen: number }>();
  for (const event of events) {
    if (!event.location_id) continue;
    if (inCurrent(event.created_at, window)) {
      const bucket = current.get(event.location_id) || { on_screen: 0, claims: 0 };
      if (event.event_type === 'delivered' && event.impression_on_screen) bucket.on_screen += 1;
      if (event.event_type === 'claimed') bucket.claims += 1;
      current.set(event.location_id, bucket);
    } else if (inPrevious(event.created_at, window)) {
      const bucket = previous.get(event.location_id) || { on_screen: 0 };
      if (event.event_type === 'delivered' && event.impression_on_screen) bucket.on_screen += 1;
      previous.set(event.location_id, bucket);
    }
  }
  const revenue = new Map<string, number>();
  for (const invoice of invoices) {
    if (!isCountedInvoice(invoice) || !inCurrent(invoice.created_at, window)) continue;
    const branchId = exclusiveBranch(invoice.location_ids);
    if (!branchId) continue;
    revenue.set(branchId, (revenue.get(branchId) || 0) + invoice.supermarket_share);
  }
  return locations
    .map((location) => {
      const nowCounts = current.get(location.id) || { on_screen: 0, claims: 0 };
      const prior = previous.get(location.id)?.on_screen || 0;
      return {
        location_id: location.id,
        name: location.name,
        on_screen: nowCounts.on_screen,
        claims: nowCounts.claims,
        delta_pct: percentDelta(nowCounts.on_screen, prior),
        ad_revenue: Math.round((revenue.get(location.id) || 0) * 100) / 100,
      };
    })
    .sort((a, b) => b.on_screen - a.on_screen || a.name.localeCompare(b.name));
}

function buildRevenue(invoices: OverviewInvoice[], window: OverviewWindow, locationId: string | null) {
  const days = eachNairobiDay(window.start, window.end);
  const series = new Map(days.map((day) => [day, 0]));
  let gross = 0;
  let supermarketShare = 0;
  let dukanestShare = 0;
  let omittedShared = 0;

  for (const invoice of invoices) {
    if (!isCountedInvoice(invoice) || !inCurrent(invoice.created_at, window)) continue;
    const branchId = exclusiveBranch(invoice.location_ids);
    if (locationId && branchId !== locationId) {
      if (invoice.location_ids.includes(locationId)) omittedShared += 1;
      continue;
    }
    gross += invoice.amount;
    supermarketShare += invoice.supermarket_share;
    dukanestShare += invoice.dukanest_share;
    const day = nairobiDayKey(new Date(invoice.created_at));
    if (series.has(day)) series.set(day, (series.get(day) || 0) + invoice.amount);
  }

  const round = (value: number) => Math.round(value * 100) / 100;
  const supermarketPct = gross ? Math.round((supermarketShare / gross) * 1000) / 10 : 0;
  const dukanestPct = gross ? Math.round((dukanestShare / gross) * 1000) / 10 : 0;
  return {
    series: days.map((day) => ({ day, amount: round(series.get(day) || 0) })),
    gross: round(gross),
    supermarket_share: round(supermarketShare),
    dukanest_share: round(dukanestShare),
    supermarket_pct: supermarketPct,
    dukanest_pct: dukanestPct,
    omitted_shared_invoices: omittedShared,
  };
}

function buildActivity(
  input: {
    now: Date;
    campaigns: OverviewCampaign[];
    beacons: OverviewBeacon[];
    invoices: OverviewInvoice[];
    claims: OverviewClaim[];
  },
  locationId: string | null,
  locationName: Map<string, string>
) {
  const since = input.now.getTime() - ACTIVITY_WINDOW_MS;
  const items: Array<{ at: string; title: string; branch: string; tone: ActivityTone }> = [];
  const recent = (value: string | null) => {
    if (!value) return false;
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time >= since && time <= input.now.getTime();
  };

  for (const campaign of input.campaigns) {
    if (locationId && !campaign.location_ids.includes(locationId)) continue;
    if (!recent(campaign.updated_at)) continue;
    const activity = campaignActivity(campaign.name, campaign.status);
    if (!activity || !campaign.updated_at) continue;
    items.push({
      at: campaign.updated_at,
      title: activity.title,
      branch: branchLabel(campaign.location_ids, locationName),
      tone: activity.tone,
    });
  }

  for (const beacon of input.beacons) {
    if (locationId && beacon.location_id !== locationId) continue;
    const tone = beacon.status === 'active' ? beaconTone(beacon, input.now) : null;
    if (tone !== 'offline' && tone !== 'low_battery') continue;
    const at = beacon.last_seen_at || beacon.created_at;
    if (!at || !recent(at)) continue;
    const label = beacon.name || beacon.zone_name;
    items.push({
      at,
      title: tone === 'low_battery' ? `${label} battery low` : `${label} beacon offline`,
      branch: beacon.location_name,
      tone: 'attention',
    });
  }

  for (const claim of input.claims) {
    if (!claim.redeemed_at || !recent(claim.redeemed_at)) continue;
    if (locationId && !claim.location_ids.includes(locationId)) continue;
    items.push({
      at: claim.redeemed_at,
      title: `Coupon redeemed${claim.campaign_name ? ` · ${claim.campaign_name}` : ''}`,
      branch: branchLabel(claim.location_ids, locationName),
      tone: 'completed',
    });
  }

  for (const invoice of input.invoices) {
    if (!recent(invoice.created_at)) continue;
    if (locationId && exclusiveBranch(invoice.location_ids) !== locationId) continue;
    if (invoice.status === 'paid') {
      items.push({
        at: invoice.created_at,
        title: `Invoice paid${invoice.campaign_name ? ` · ${invoice.campaign_name}` : ''}`,
        branch: branchLabel(invoice.location_ids, locationName),
        tone: 'completed',
      });
    } else if (invoice.status === 'issued') {
      items.push({
        at: invoice.created_at,
        title: `Invoice issued${invoice.campaign_name ? ` · ${invoice.campaign_name}` : ''}`,
        branch: branchLabel(invoice.location_ids, locationName),
        tone: 'active',
      });
    }
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);
}

function campaignActivity(name: string, status: string): { title: string; tone: ActivityTone } | null {
  if (status === 'live' || status === 'approved') return { title: `${name} campaign approved`, tone: 'active' };
  if (status === 'scheduled') return { title: `${name} scheduled`, tone: 'scheduled' };
  if (status === 'submitted') return { title: `${name} submitted for review`, tone: 'scheduled' };
  if (status === 'rejected') return { title: `${name} needs changes`, tone: 'attention' };
  if (status === 'ended') return { title: `${name} ended`, tone: 'completed' };
  if (status === 'paused') return { title: `${name} paused`, tone: 'attention' };
  return null;
}

function branchLabel(locationIds: string[], names: Map<string, string>) {
  const unique = [...new Set(locationIds)];
  if (unique.length === 0) return 'All branches';
  if (unique.length === 1) return names.get(unique[0]) || 'Branch';
  return `${unique.length} branches`;
}

function exclusiveBranch(locationIds: string[]) {
  const unique = [...new Set(locationIds)];
  return unique.length === 1 ? unique[0] : null;
}

function isCountedInvoice(invoice: OverviewInvoice) {
  return COUNTED_INVOICE_STATUSES.includes(invoice.status);
}

function beaconTone(beacon: OverviewBeacon, now: Date): BeaconTone {
  const seen = beacon.last_seen_at ? new Date(beacon.last_seen_at).getTime() : 0;
  if (!seen || now.getTime() - seen > PROXIMITY_DARK_SLOT_MS) return 'offline';
  if (beacon.battery_mv != null && beacon.battery_mv < PROXIMITY_LOW_BATTERY_MV) return 'low_battery';
  return 'online';
}

function inCurrent(value: string | null, window: OverviewWindow) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return time >= window.start.getTime() && time <= window.end.getTime();
}

function inPrevious(value: string | null, window: OverviewWindow) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return time >= window.previousStart.getTime() && time < window.previousEnd.getTime();
}
