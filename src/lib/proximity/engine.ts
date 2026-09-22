import {
  HOUSE_CAMPAIGN_PRIORITY,
  PRIVACY_COPY_EN,
  PROXIMITY_DARK_SLOT_MS,
  SPOOFING_DISCLOSURE_EN,
  VENDOR_CAMPAIGN_PRIORITY,
} from './constants';

export type CampaignKind = 'house' | 'vendor';

export type EngineCampaign = {
  id: string;
  advertiserId: string | null;
  status: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  tradingHoursStart: string | null;
  tradingHoursEnd: string | null;
  frequencyCapPerDay: number;
  visitStormCap: number;
  dwellMs: number;
  priority: number;
  billingPaused: boolean;
  locationId: string;
  zoneId: string;
};

export type EngineInput = {
  now: Date;
  consent: boolean;
  source: 'ble' | 'qr';
  dwellElapsedMs: number;
  /** On-screen deliveries today, keyed by campaign id (1/campaign/customer/day). */
  deliveredTodayByCampaign: Record<string, number>;
  /** Visit-level storm cap across all campaigns. */
  deliveredThisVisit: number;
  campaigns: EngineCampaign[];
};

export type EngineDecision =
  | { action: 'none'; reason: string }
  | {
      action: 'eligible';
      campaign: EngineCampaign;
      kind: CampaignKind;
      privacyCopy: string;
      spoofingDisclosure: string;
    };

function inTradingHours(campaign: EngineCampaign, now: Date): boolean {
  if (!campaign.tradingHoursStart || !campaign.tradingHoursEnd) {
    return true;
  }
  const current = minutesFromMidnight(formatHm(now, campaign.timezone));
  const start = minutesFromHm(campaign.tradingHoursStart);
  const end = minutesFromHm(campaign.tradingHoursEnd);
  if (start <= end) {
    return current >= start && current <= end;
  }
  return current >= start || current <= end;
}

function formatHm(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone || 'Africa/Nairobi',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(now);
  } catch {
    return `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
  }
}

function minutesFromHm(value: string): number {
  const [h, m] = value.split(':').map((part) => parseInt(part, 10));
  return (h || 0) * 60 + (m || 0);
}

function minutesFromMidnight(hm: string): number {
  return minutesFromHm(hm.replace('.', ':'));
}

export function isLiveStatus(status: string, now: Date, startsAt: Date, endsAt: Date): boolean {
  if (status === 'paused' || status === 'rejected' || status === 'draft' || status === 'submitted') {
    return false;
  }
  if (now < startsAt || now > endsAt) {
    return false;
  }
  return status === 'approved' || status === 'scheduled' || status === 'live';
}

/**
 * Vendor exclusive slot wins over house so a paid flight is not overwritten.
 * House fills when no eligible vendor campaign remains.
 */
export function selectCampaign(input: EngineInput): EngineDecision {
  if (!input.consent) {
    return { action: 'none', reason: 'consent_required' };
  }

  const live = input.campaigns.filter(
    (campaign) =>
      !campaign.billingPaused &&
      isLiveStatus(campaign.status, input.now, campaign.startsAt, campaign.endsAt) &&
      inTradingHours(campaign, input.now)
  );

  if (live.length === 0) {
    return { action: 'none', reason: 'no_live_campaign' };
  }

  const vendors = live
    .filter((campaign) => campaign.advertiserId)
    .sort((a, b) => b.priority - a.priority || VENDOR_CAMPAIGN_PRIORITY - HOUSE_CAMPAIGN_PRIORITY);
  const houses = live
    .filter((campaign) => !campaign.advertiserId)
    .sort((a, b) => b.priority - a.priority);

  const ordered = [...vendors, ...houses];

  for (const campaign of ordered) {
    if (input.source === 'ble' && input.dwellElapsedMs < campaign.dwellMs) {
      continue;
    }
    const deliveredToday = input.deliveredTodayByCampaign[campaign.id] ?? 0;
    if (deliveredToday >= campaign.frequencyCapPerDay) {
      continue;
    }
    if (input.deliveredThisVisit >= campaign.visitStormCap) {
      continue;
    }
    return {
      action: 'eligible',
      campaign,
      kind: campaign.advertiserId ? 'vendor' : 'house',
      privacyCopy: PRIVACY_COPY_EN,
      spoofingDisclosure: SPOOFING_DISCLOSURE_EN,
    };
  }

  if (input.source === 'ble' && live.some((campaign) => input.dwellElapsedMs < campaign.dwellMs)) {
    return { action: 'none', reason: 'dwell_not_met' };
  }
  return { action: 'none', reason: 'frequency_or_storm_capped' };
}

export function placementsOverlap(
  a: { locationId: string; zoneId: string; startsAt: Date; endsAt: Date },
  b: { locationId: string; zoneId: string; startsAt: Date; endsAt: Date }
): boolean {
  if (a.locationId !== b.locationId || a.zoneId !== b.zoneId) {
    return false;
  }
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export function isDarkSlot(lastSeenAt: Date | null, now: Date): boolean {
  if (!lastSeenAt) {
    return true;
  }
  return now.getTime() - lastSeenAt.getTime() > PROXIMITY_DARK_SLOT_MS;
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'branch';
}
