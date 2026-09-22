import { prisma } from '@/lib/prisma/client';
import { DUKANEST_PROXIMITY_UUID, PROXIMITY_CLAIM_TTL_MS, PROXIMITY_DARK_SLOT_MS } from './constants';
import { placementsOverlap, selectCampaign, slugify, type EngineCampaign } from './engine';
import { generateClaimCode, hashSecret, secretsEqual, generateAccessToken } from './tokens';
import { campaignPriority } from './validation';

function timeToHm(value: Date | null | undefined): string | null {
  if (!value) return null;
  return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
}

function hmToTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(`1970-01-01T${value}:00.000Z`);
}

export async function findBeacon(params: {
  uuid?: string;
  major?: number;
  minor?: number;
  locationId?: string;
  zoneId?: string;
}) {
  if (params.locationId && params.zoneId) {
    return prisma.proximity_beacons.findFirst({
      where: { location_id: params.locationId, zone_id: params.zoneId, status: 'active' },
      include: { location: true, zone: true },
    });
  }
  if (params.major === undefined || params.minor === undefined) {
    return null;
  }
  return prisma.proximity_beacons.findFirst({
    where: {
      ibeacon_uuid: (params.uuid || DUKANEST_PROXIMITY_UUID).toLowerCase(),
      major: params.major,
      minor: params.minor,
      status: 'active',
    },
    include: { location: true, zone: true },
  });
}

export async function touchBeaconSeen(beaconId: string) {
  await prisma.proximity_beacons.update({
    where: { id: beaconId },
    data: { last_seen_at: new Date(), updated_at: new Date() },
  });
}

async function loadEngineCampaigns(tenantId: string, locationId: string, zoneId: string): Promise<EngineCampaign[]> {
  const campaigns = await prisma.proximity_campaigns.findMany({
    where: {
      tenant_id: tenantId,
      billing_paused: false,
      placements: { some: { location_id: locationId, zone_id: zoneId } },
    },
    include: { placements: true },
  });

  return campaigns.map((campaign) => ({
    id: campaign.id,
    advertiserId: campaign.advertiser_id,
    status: campaign.status,
    startsAt: campaign.starts_at,
    endsAt: campaign.ends_at,
    timezone: campaign.timezone,
    tradingHoursStart: timeToHm(campaign.trading_hours_start),
    tradingHoursEnd: timeToHm(campaign.trading_hours_end),
    frequencyCapPerDay: campaign.frequency_cap_per_day,
    visitStormCap: campaign.visit_storm_cap,
    dwellMs: campaign.dwell_ms,
    priority: campaign.priority,
    billingPaused: campaign.billing_paused,
    locationId,
    zoneId,
  }));
}

function startOfDayNairobi(now = new Date()): Date {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return new Date(`${day}T00:00:00+03:00`);
}

async function countDelivered(params: {
  tenantId: string;
  opaqueCustomerId: string;
  visitId?: string;
}) {
  const startOfDay = startOfDayNairobi();
  const [todayRows, visit] = await Promise.all([
    prisma.proximity_events.groupBy({
      by: ['campaign_id'],
      where: {
        tenant_id: params.tenantId,
        opaque_customer_id: params.opaqueCustomerId,
        event_type: 'delivered',
        impression_on_screen: true,
        created_at: { gte: startOfDay },
      },
      _count: { _all: true },
    }),
    params.visitId
      ? prisma.proximity_events.count({
          where: {
            tenant_id: params.tenantId,
            opaque_customer_id: params.opaqueCustomerId,
            visit_id: params.visitId,
            event_type: 'delivered',
            impression_on_screen: true,
          },
        })
      : Promise.resolve(0),
  ]);
  const todayByCampaign: Record<string, number> = {};
  for (const row of todayRows) {
    if (row.campaign_id) {
      todayByCampaign[row.campaign_id] = row._count._all;
    }
  }
  return { todayByCampaign, visit };
}

export async function resolveCurrentAd(params: {
  tenantId: string;
  uuid?: string;
  major?: number;
  minor?: number;
  locationId?: string;
  zoneId?: string;
  campaignId?: string;
  opaqueCustomerId: string;
  visitId?: string;
  consent: boolean;
  source: 'ble' | 'qr';
  dwellElapsedMs: number;
}) {
  const beacon = await findBeacon(params);
  const locationId = params.locationId || beacon?.location_id;
  const zoneId = params.zoneId || beacon?.zone_id;
  if (!locationId || !zoneId) {
    return { action: 'none' as const, reason: 'zone_not_found', privacyCopy: null, card: null };
  }

  if (beacon) {
    await touchBeaconSeen(beacon.id);
  }

  if (params.campaignId && params.source === 'qr') {
    const campaign = await prisma.proximity_campaigns.findFirst({
      where: { id: params.campaignId, tenant_id: params.tenantId },
    });
    if (campaign) {
      const engineCampaign: EngineCampaign = {
        id: campaign.id,
        advertiserId: campaign.advertiser_id,
        status: campaign.status,
        startsAt: campaign.starts_at,
        endsAt: campaign.ends_at,
        timezone: campaign.timezone,
        tradingHoursStart: timeToHm(campaign.trading_hours_start),
        tradingHoursEnd: timeToHm(campaign.trading_hours_end),
        frequencyCapPerDay: campaign.frequency_cap_per_day,
        visitStormCap: campaign.visit_storm_cap,
        dwellMs: campaign.dwell_ms,
        priority: campaign.priority,
        billingPaused: campaign.billing_paused,
        locationId,
        zoneId,
      };
      const counts = await countDelivered({
        tenantId: params.tenantId,
        opaqueCustomerId: params.opaqueCustomerId,
        visitId: params.visitId,
      });
      const decision = selectCampaign({
        now: new Date(),
        consent: params.consent,
        source: 'qr',
        dwellElapsedMs: 0,
        deliveredTodayByCampaign: counts.todayByCampaign,
        deliveredThisVisit: counts.visit,
        campaigns: [engineCampaign],
      });
      if (decision.action === 'eligible') {
        return decorateCard(params.tenantId, decision.campaign.id, beacon?.id || null, locationId, zoneId);
      }
      return { action: 'none' as const, reason: decision.reason, privacyCopy: null, card: null };
    }
  }

  const campaigns = await loadEngineCampaigns(params.tenantId, locationId, zoneId);
  const counts = await countDelivered({
    tenantId: params.tenantId,
    opaqueCustomerId: params.opaqueCustomerId,
    visitId: params.visitId,
  });
  const decision = selectCampaign({
    now: new Date(),
    consent: params.consent,
    source: params.source,
    dwellElapsedMs: params.dwellElapsedMs,
    deliveredTodayByCampaign: counts.todayByCampaign,
    deliveredThisVisit: counts.visit,
    campaigns,
  });

  if (decision.action !== 'eligible') {
    return { action: 'none' as const, reason: decision.reason, privacyCopy: null, card: null, locationId, zoneId, beaconId: beacon?.id || null };
  }

  return decorateCard(params.tenantId, decision.campaign.id, beacon?.id || null, locationId, zoneId);
}

async function decorateCard(
  tenantId: string,
  campaignId: string,
  beaconId: string | null,
  locationId: string,
  zoneId: string
) {
  const campaign = await prisma.proximity_campaigns.findFirst({
    where: { id: campaignId, tenant_id: tenantId },
    include: { advertiser: { select: { id: true, name: true } } },
  });
  if (!campaign) {
    return { action: 'none' as const, reason: 'campaign_missing', privacyCopy: null, card: null };
  }
  return {
    action: 'eligible' as const,
    reason: null,
    locationId,
    zoneId,
    beaconId,
    card: {
      campaign_id: campaign.id,
      kind: campaign.advertiser_id ? 'vendor' : 'house',
      headline: campaign.headline,
      body: campaign.body,
      image_url: campaign.image_url,
      cta_label: campaign.cta_label,
      cta_url: campaign.cta_url,
      coupon_enabled: campaign.coupon_enabled,
      coupon_label: campaign.coupon_label,
      advertiser_name: campaign.advertiser?.name || null,
      dwell_ms: campaign.dwell_ms,
      qr_path: `/api/v1/proximity/qr/${campaign.id}`,
    },
  };
}

export async function recordEvent(input: {
  tenantId: string;
  campaignId?: string | null;
  locationId?: string | null;
  zoneId?: string | null;
  beaconId?: string | null;
  opaqueCustomerId: string;
  visitId?: string;
  eventType: 'detected' | 'delivered' | 'clicked' | 'claimed' | 'nothing';
  source: 'ble' | 'qr';
  consent: boolean;
  impressionOnScreen?: boolean;
}) {
  if (input.eventType === 'delivered' && !input.impressionOnScreen) {
    throw new Error('Impressions are counted only when the in-app card is on screen.');
  }
  if (input.beaconId) {
    await touchBeaconSeen(input.beaconId);
  }
  return prisma.proximity_events.create({
    data: {
      tenant_id: input.tenantId,
      campaign_id: input.campaignId || null,
      location_id: input.locationId || null,
      zone_id: input.zoneId || null,
      beacon_id: input.beaconId || null,
      opaque_customer_id: input.opaqueCustomerId,
      visit_id: input.visitId || null,
      event_type: input.eventType,
      source: input.source,
      consent: input.consent,
      impression_on_screen: input.eventType === 'delivered' ? true : Boolean(input.impressionOnScreen),
    },
  });
}

export async function claimOffer(input: { tenantId: string; campaignId: string; opaqueCustomerId: string }) {
  const campaign = await prisma.proximity_campaigns.findFirst({
    where: { id: input.campaignId, tenant_id: input.tenantId, coupon_enabled: true },
  });
  if (!campaign) {
    throw new Error('This campaign has no claimable offer.');
  }
  const existing = await prisma.proximity_claims.findFirst({
    where: {
      tenant_id: input.tenantId,
      campaign_id: input.campaignId,
      opaque_customer_id: input.opaqueCustomerId,
    },
  });
  if (existing) {
    return existing;
  }
  const claim = await prisma.proximity_claims.create({
    data: {
      tenant_id: input.tenantId,
      campaign_id: input.campaignId,
      opaque_customer_id: input.opaqueCustomerId,
      code: generateClaimCode(campaign.name),
      expires_at: new Date(Date.now() + PROXIMITY_CLAIM_TTL_MS),
    },
  });
  await recordEvent({
    tenantId: input.tenantId,
    campaignId: input.campaignId,
    opaqueCustomerId: input.opaqueCustomerId,
    eventType: 'claimed',
    source: 'ble',
    consent: true,
    impressionOnScreen: true,
  });
  return claim;
}

export async function assertVendorPlacementExclusive(input: {
  tenantId: string;
  campaignId?: string;
  advertiserId: string | null | undefined;
  startsAt: Date;
  endsAt: Date;
  placements: { location_id: string; zone_id: string }[];
}) {
  if (!input.advertiserId) {
    return;
  }
  const others = await prisma.proximity_campaigns.findMany({
    where: {
      tenant_id: input.tenantId,
      advertiser_id: { not: null },
      id: input.campaignId ? { not: input.campaignId } : undefined,
      status: { in: ['submitted', 'approved', 'scheduled', 'live'] },
    },
    include: { placements: true },
  });
  for (const other of others) {
    for (const placement of input.placements) {
      for (const existing of other.placements) {
        if (
          placementsOverlap(
            {
              locationId: placement.location_id,
              zoneId: placement.zone_id,
              startsAt: input.startsAt,
              endsAt: input.endsAt,
            },
            {
              locationId: existing.location_id,
              zoneId: existing.zone_id,
              startsAt: other.starts_at,
              endsAt: other.ends_at,
            }
          )
        ) {
          throw new Error('Another vendor campaign already holds this branch/zone for overlapping dates.');
        }
      }
    }
  }
}

export type CampaignRecordInput = {
  advertiser_id?: string | null;
  name: string;
  headline: string;
  body?: string | null;
  image_url?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  coupon_enabled?: boolean;
  coupon_label?: string | null;
  coupon_discount_type?: string | null;
  coupon_discount_value?: number | null;
  starts_at: string;
  ends_at: string;
  timezone?: string;
  trading_hours_start?: string | null;
  trading_hours_end?: string | null;
  frequency_cap_per_day?: number;
  visit_storm_cap?: number;
  dwell_ms?: number;
  brand_safety_category?: string | null;
  fee_amount?: number | null;
  supermarket_share_pct?: number;
  terms_accepted?: boolean;
  placements: { location_id: string; zone_id: string }[];
};

export async function createCampaignRecord(
  tenantId: string,
  body: CampaignRecordInput,
  status: string
) {
  const startsAt = new Date(body.starts_at);
  const endsAt = new Date(body.ends_at);
  if (!(startsAt < endsAt)) {
    throw new Error('ends_at must be after starts_at');
  }
  await assertVendorPlacementExclusive({
    tenantId,
    advertiserId: body.advertiser_id,
    startsAt,
    endsAt,
    placements: body.placements,
  });
  return prisma.proximity_campaigns.create({
    data: {
      tenant_id: tenantId,
      advertiser_id: body.advertiser_id || null,
      name: body.name,
      headline: body.headline,
      body: body.body || null,
      image_url: body.image_url || null,
      cta_label: body.cta_label || 'View offer',
      cta_url: body.cta_url || null,
      coupon_enabled: Boolean(body.coupon_enabled),
      coupon_label: body.coupon_label || null,
      coupon_discount_type: body.coupon_discount_type || null,
      coupon_discount_value: body.coupon_discount_value ?? null,
      starts_at: startsAt,
      ends_at: endsAt,
      timezone: body.timezone || 'Africa/Nairobi',
      trading_hours_start: hmToTime(body.trading_hours_start),
      trading_hours_end: hmToTime(body.trading_hours_end),
      frequency_cap_per_day: body.frequency_cap_per_day ?? 1,
      visit_storm_cap: body.visit_storm_cap ?? 3,
      dwell_ms: body.dwell_ms ?? 2500,
      priority: campaignPriority(body.advertiser_id),
      brand_safety_category: body.brand_safety_category || null,
      status,
      fee_amount: body.fee_amount ?? null,
      supermarket_share_pct: body.supermarket_share_pct ?? 70,
      terms_accepted_at: body.terms_accepted ? new Date() : null,
      placements: {
        create: body.placements.map((placement) => ({
          tenant_id: tenantId,
          location_id: placement.location_id,
          zone_id: placement.zone_id,
        })),
      },
    },
    include: { placements: true, advertiser: true },
  });
}

export async function updateCampaignRecord(
  tenantId: string,
  campaignId: string,
  body: CampaignRecordInput
) {
  const existing = await prisma.proximity_campaigns.findFirst({
    where: { id: campaignId, tenant_id: tenantId },
  });
  if (!existing) {
    throw Object.assign(new Error('Campaign not found'), { status: 404 });
  }

  const startsAt = new Date(body.starts_at);
  const endsAt = new Date(body.ends_at);
  if (!(startsAt < endsAt)) {
    throw new Error('End date must be after the start date.');
  }

  await assertVendorPlacementExclusive({
    tenantId,
    campaignId,
    advertiserId: body.advertiser_id,
    startsAt,
    endsAt,
    placements: body.placements,
  });

  return prisma.proximity_campaigns.update({
    where: { id: campaignId },
    data: {
      advertiser_id: body.advertiser_id || null,
      name: body.name,
      headline: body.headline,
      body: body.body || null,
      image_url: body.image_url || null,
      cta_label: body.cta_label || 'View offer',
      cta_url: body.cta_url || null,
      coupon_enabled: Boolean(body.coupon_enabled),
      coupon_label: body.coupon_label || null,
      coupon_discount_type: body.coupon_discount_type || null,
      coupon_discount_value: body.coupon_discount_value ?? null,
      starts_at: startsAt,
      ends_at: endsAt,
      timezone: body.timezone || existing.timezone,
      trading_hours_start: hmToTime(body.trading_hours_start),
      trading_hours_end: hmToTime(body.trading_hours_end),
      frequency_cap_per_day: body.frequency_cap_per_day ?? existing.frequency_cap_per_day,
      visit_storm_cap: body.visit_storm_cap ?? existing.visit_storm_cap,
      dwell_ms: body.dwell_ms ?? existing.dwell_ms,
      priority: campaignPriority(body.advertiser_id),
      brand_safety_category: body.brand_safety_category || null,
      fee_amount: body.fee_amount ?? null,
      supermarket_share_pct:
        body.supermarket_share_pct ?? Number(existing.supermarket_share_pct),
      updated_at: new Date(),
      placements: {
        deleteMany: {},
        create: body.placements.map((placement) => ({
          tenant_id: tenantId,
          location_id: placement.location_id,
          zone_id: placement.zone_id,
        })),
      },
    },
    include: {
      advertiser: true,
      placements: { include: { location: true, zone: true } },
    },
  });
}

export async function campaignStats(tenantId: string, campaignId?: string, advertiserId?: string) {
  const where = {
    tenant_id: tenantId,
    ...(campaignId ? { campaign_id: campaignId } : {}),
    ...(advertiserId
      ? { campaign: { advertiser_id: advertiserId } }
      : {}),
  };
  const [delivered, clicked, claimed, detected] = await Promise.all([
    prisma.proximity_events.count({
      where: { ...where, event_type: 'delivered', impression_on_screen: true },
    }),
    prisma.proximity_events.count({ where: { ...where, event_type: 'clicked' } }),
    prisma.proximity_events.count({ where: { ...where, event_type: 'claimed' } }),
    advertiserId
      ? Promise.resolve(0)
      : prisma.proximity_events.count({ where: { ...where, event_type: 'detected' } }),
  ]);
  return {
    detected: advertiserId ? undefined : detected,
    delivered,
    clicked,
    claimed,
    ctr: delivered ? clicked / delivered : 0,
    note: 'Impressions are on-screen cards only. Till purchases without a claim are not measured. This is not ROAS.',
  };
}

export async function darkSlots(tenantId: string) {
  const cutoff = new Date(Date.now() - PROXIMITY_DARK_SLOT_MS);
  return prisma.proximity_beacons.findMany({
    where: {
      tenant_id: tenantId,
      status: 'active',
      OR: [{ last_seen_at: null }, { last_seen_at: { lt: cutoff } }],
    },
    include: { zone: true, location: true },
  });
}

export async function createManualInvoice(input: {
  tenantId: string;
  campaignId: string;
  amount: number;
  notes?: string | null;
}) {
  const campaign = await prisma.proximity_campaigns.findFirst({
    where: { id: input.campaignId, tenant_id: input.tenantId },
  });
  if (!campaign) {
    throw new Error('Campaign not found');
  }
  if (!campaign.advertiser_id) {
    throw new Error('House campaigns are not invoiced to vendors.');
  }
  const supermarketPct = Number(campaign.supermarket_share_pct);
  const supermarketShare = Math.round(input.amount * supermarketPct) / 100;
  const dukanestShare = Math.round((input.amount - supermarketShare) * 100) / 100;
  return prisma.proximity_invoices.create({
    data: {
      tenant_id: input.tenantId,
      campaign_id: campaign.id,
      advertiser_id: campaign.advertiser_id,
      amount: input.amount,
      supermarket_share: supermarketShare,
      dukanest_share: dukanestShare,
      status: 'draft',
      notes: input.notes || 'Manual Phase 1 invoice. Settlement is offline (invoice / M-Pesa).',
    },
  });
}

export async function pauseBillingForDarkVendorSlots(tenantId: string) {
  const dark = await darkSlots(tenantId);
  const zoneIds = dark.map((beacon) => beacon.zone_id);
  if (zoneIds.length === 0) return [];
  const campaigns = await prisma.proximity_campaigns.findMany({
    where: {
      tenant_id: tenantId,
      advertiser_id: { not: null },
      status: { in: ['live', 'approved', 'scheduled'] },
      billing_paused: false,
      placements: { some: { zone_id: { in: zoneIds } } },
    },
  });
  await prisma.proximity_campaigns.updateMany({
    where: { id: { in: campaigns.map((campaign) => campaign.id) } },
    data: { billing_paused: true, updated_at: new Date() },
  });
  return campaigns;
}

const ACTIVE_PLACEMENT_STATUSES = ['submitted', 'approved', 'scheduled', 'live'];

export async function uniqueLocationSlug(tenantId: string, name: string, excludeId?: string) {
  const base = slugify(name);
  let slug = base;
  for (let n = 2; n < 50; n += 1) {
    const taken = await prisma.proximity_locations.findFirst({
      where: {
        tenant_id: tenantId,
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!taken) return slug;
    slug = `${base.slice(0, 76)}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

export async function uniqueZoneSlug(locationId: string, name: string, excludeId?: string) {
  const base = slugify(name);
  let slug = base;
  for (let n = 2; n < 50; n += 1) {
    const taken = await prisma.proximity_zones.findFirst({
      where: {
        location_id: locationId,
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!taken) return slug;
    slug = `${base.slice(0, 76)}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

export async function assertNoActivePlacements(params: {
  tenantId: string;
  locationId?: string;
  zoneId?: string;
}) {
  const count = await prisma.proximity_campaign_placements.count({
    where: {
      tenant_id: params.tenantId,
      ...(params.locationId ? { location_id: params.locationId } : {}),
      ...(params.zoneId ? { zone_id: params.zoneId } : {}),
      campaign: { status: { in: ACTIVE_PLACEMENT_STATUSES } },
    },
  });
  if (count > 0) {
    throw Object.assign(
      new Error(
        params.zoneId
          ? 'This zone is used by an active campaign. End or move that campaign first.'
          : 'This branch is used by an active campaign. End or move that campaign first.'
      ),
      { status: 409 }
    );
  }
}

export { slugify, generateAccessToken, hashSecret, secretsEqual, hmToTime };
