import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { HOUSE_CAMPAIGN_PRIORITY, VENDOR_CAMPAIGN_PRIORITY } from './constants';

export const locationInputSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().max(120).optional(),
  address: z.string().max(2000).optional().nullable(),
  timezone: z.string().max(64).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const zoneInputSchema = z.object({
  location_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().max(120).optional(),
  kind: z.string().max(40).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const beaconInputSchema = z.object({
  location_id: z.string().uuid(),
  zone_id: z.string().uuid(),
  name: z.string().max(255).optional().nullable(),
  mac_address: z.string().max(32).optional().nullable(),
  qr_code: z.string().max(128).optional().nullable(),
  ibeacon_uuid: z.string().uuid().optional(),
  major: z.number().int().min(0).max(65535),
  minor: z.number().int().min(0).max(65535),
  tx_power_dbm: z.number().optional(),
  adv_interval_ms: z.number().int().min(100).max(1500).optional(),
  status: z.enum(['active', 'inactive', 'missing']).optional(),
});

export const advertiserInputSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export const campaignInputSchema = z.object({
  advertiser_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(255),
  headline: z.string().min(1).max(255),
  body: z.string().max(4000).optional().nullable(),
  image_url: z.string().url().max(500).optional().nullable(),
  cta_label: z.string().max(80).optional().nullable(),
  cta_url: z.string().url().max(500).optional().nullable(),
  coupon_enabled: z.boolean().optional(),
  coupon_label: z.string().max(120).optional().nullable(),
  coupon_discount_type: z.enum(['percent', 'fixed']).optional().nullable(),
  coupon_discount_value: z.number().nonnegative().optional().nullable(),
  starts_at: z.string().datetime({ offset: true }).or(z.string().min(1)),
  ends_at: z.string().datetime({ offset: true }).or(z.string().min(1)),
  timezone: z.string().max(64).optional(),
  trading_hours_start: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Use a valid time in HH:MM format')
    .optional()
    .nullable(),
  trading_hours_end: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Use a valid time in HH:MM format')
    .optional()
    .nullable(),
  frequency_cap_per_day: z.number().int().min(1).max(20).optional(),
  visit_storm_cap: z.number().int().min(1).max(20).optional(),
  dwell_ms: z.number().int().min(0).max(15000).optional(),
  brand_safety_category: z.string().max(80).optional().nullable(),
  fee_amount: z.number().nonnegative().optional().nullable(),
  supermarket_share_pct: z.number().min(0).max(100).optional(),
  terms_accepted: z.boolean().optional(),
  placements: z
    .array(
      z.object({
        location_id: z.string().uuid(),
        zone_id: z.string().uuid(),
      })
    )
    .min(1),
});

export const currentAdQuerySchema = z.object({
  uuid: z.string().uuid().optional(),
  major: z.coerce.number().int().min(0).max(65535).optional(),
  minor: z.coerce.number().int().min(0).max(65535).optional(),
  location_id: z.string().uuid().optional(),
  zone_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  opaque_customer_id: z.string().min(4).max(128),
  visit_id: z.string().max(64).optional(),
  consent: z.enum(['true', 'false']).optional(),
  source: z.enum(['ble', 'qr']).optional(),
  dwell_elapsed_ms: z.coerce.number().int().min(0).max(60000).optional(),
});

export const eventInputSchema = z.object({
  uuid: z.string().uuid().optional(),
  major: z.coerce.number().int().optional(),
  minor: z.coerce.number().int().optional(),
  location_id: z.string().uuid().optional(),
  zone_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional().nullable(),
  opaque_customer_id: z.string().min(4).max(128),
  visit_id: z.string().max(64).optional(),
  event_type: z.enum(['detected', 'delivered', 'clicked', 'claimed', 'nothing']),
  source: z.enum(['ble', 'qr']).optional(),
  consent: z.boolean(),
  impression_on_screen: z.boolean().optional(),
  dwell_elapsed_ms: z.number().int().min(0).optional(),
});

export const claimInputSchema = z.object({
  campaign_id: z.string().uuid(),
  opaque_customer_id: z.string().min(4).max(128),
});

export function campaignPriority(advertiserId: string | null | undefined): number {
  return advertiserId ? VENDOR_CAMPAIGN_PRIORITY : HOUSE_CAMPAIGN_PRIORITY;
}

export function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function tokenMatches(plain: string, hash: string): boolean {
  const hashed = Buffer.from(hashToken(plain));
  const stored = Buffer.from(hash);
  if (hashed.length !== stored.length) return false;
  return timingSafeEqual(hashed, stored);
}

export function newSdkKey(flavor: 'scan' | 'commission'): { token: string; prefix: string; hash: string } {
  const raw = randomBytes(24).toString('base64url');
  const token = `dn_${flavor}_${raw}`;
  return { token, prefix: token.slice(0, 20), hash: hashToken(token) };
}

export { randomBytes };
