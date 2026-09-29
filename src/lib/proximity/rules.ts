/** Pure proximity rules shared by the engine, invoices, reports, and dashboards. */

export function splitInvoiceShares(amount: number, supermarketSharePct: number) {
  const supermarketShare = Math.round(amount * supermarketSharePct) / 100;
  const dukanestShare = Math.round((amount - supermarketShare) * 100) / 100;
  return { supermarketShare, dukanestShare };
}

export function pickCreative(
  campaign: {
    id: string;
    headline: string;
    body: string | null;
    headline_sw: string | null;
    body_sw: string | null;
    headline_b: string | null;
    body_b: string | null;
    headline_b_sw: string | null;
    body_b_sw: string | null;
  },
  opaqueCustomerId: string,
  locale: 'en' | 'sw'
) {
  let hash = 0;
  const seed = `${opaqueCustomerId}:${campaign.id}`;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const variant = campaign.headline_b && hash % 2 === 1 ? 'b' : 'a';
  if (variant === 'b' && locale === 'sw' && campaign.headline_b_sw) {
    return { headline: campaign.headline_b_sw, body: campaign.body_b_sw, variant, locale: 'sw' as const };
  }
  if (variant === 'b') {
    return { headline: campaign.headline_b || campaign.headline, body: campaign.body_b, variant, locale: 'en' as const };
  }
  if (locale === 'sw' && campaign.headline_sw) {
    return { headline: campaign.headline_sw, body: campaign.body_sw, variant, locale: 'sw' as const };
  }
  return { headline: campaign.headline, body: campaign.body, variant, locale: 'en' as const };
}

export type ProximityReportEvent = {
  location_id: string | null;
  zone_id: string | null;
  event_type: string;
  opaque_customer_id: string;
  impression_on_screen: boolean | null;
};

export function summarizeProximityReports(input: {
  locations: { id: string; name: string }[];
  zones: { id: string; name: string; location_id: string; kind: string }[];
  events: ProximityReportEvent[];
}) {
  const locationName = new Map(input.locations.map((location) => [location.id, location.name]));
  const zoneName = new Map(input.zones.map((zone) => [zone.id, zone]));
  const zoneBuckets = new Map<string, Set<string>>();
  const branchBuckets = new Map<string, { delivered: number; clicked: number; claimed: number }>();

  for (const event of input.events) {
    if (event.event_type === 'detected' && event.zone_id) {
      const shoppers = zoneBuckets.get(event.zone_id) || new Set<string>();
      shoppers.add(event.opaque_customer_id);
      zoneBuckets.set(event.zone_id, shoppers);
    }
    if (!event.location_id) continue;
    const bucket = branchBuckets.get(event.location_id) || { delivered: 0, clicked: 0, claimed: 0 };
    if (event.event_type === 'delivered' && event.impression_on_screen) bucket.delivered += 1;
    if (event.event_type === 'clicked') bucket.clicked += 1;
    if (event.event_type === 'claimed') bucket.claimed += 1;
    branchBuckets.set(event.location_id, bucket);
  }

  return {
    window_days: 7,
    note: 'Zone traffic is a count of distinct opaque shopper ids. Names and phone numbers are not included.',
    zones: [...zoneBuckets.entries()]
      .map(([zoneId, shoppers]) => {
        const zone = zoneName.get(zoneId);
        return {
          zone_id: zoneId,
          zone_name: zone?.name || 'Zone',
          branch_name: zone ? locationName.get(zone.location_id) || 'Branch' : 'Branch',
          kind: zone?.kind || 'department',
          shoppers: shoppers.size,
        };
      })
      .sort((a, b) => b.shoppers - a.shoppers),
    branches: input.locations.map((location) => ({
      location_id: location.id,
      name: location.name,
      ...(branchBuckets.get(location.id) || { delivered: 0, clicked: 0, claimed: 0 }),
    })),
  };
}
