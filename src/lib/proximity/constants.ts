/** Platform iBeacon UUID. Never use AirLocate E2C56DB5-DFFB-48D2-B060-D0F5A71096E0. */
export const DUKANEST_PROXIMITY_UUID = '6e8a4c12-9f3d-4b71-a2e8-1d7c0b5e4a91';

export const AIRLOCATE_UUID = 'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0';

/** CP35 discrete TX steps (dBm) from DX-SMART user guide. */
export const CP35_TX_STEPS_DBM = [-19.5, -13.5, -9, -7, -3.5, -1, 1.5, 2.5] as const;

export function isAllowedCp35Tx(dbm: number): boolean {
  return (CP35_TX_STEPS_DBM as readonly number[]).includes(dbm);
}

export const CP35_DEFAULT_PILOT_TX_DBM = -13.5;

export const CP35_ADV_INTERVAL_MS = { min: 100, max: 1500, recommended: 500 } as const;

export const PROXIMITY_DWELL_MS_DEFAULT = 2500;
export const PROXIMITY_FREQUENCY_CAP_PER_DAY = 1;
export const PROXIMITY_VISIT_STORM_CAP = 3;
export const PROXIMITY_DARK_SLOT_MS = 24 * 60 * 60 * 1000;
export const PROXIMITY_CLAIM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const HOUSE_CAMPAIGN_PRIORITY = 40;
export const VENDOR_CAMPAIGN_PRIORITY = 80;

export const PROXIMITY_CAMPAIGN_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'rejected',
  'scheduled',
  'live',
  'ended',
  'paused',
] as const;

export type ProximityCampaignStatus = (typeof PROXIMITY_CAMPAIGN_STATUSES)[number];

export const PROXIMITY_EVENT_TYPES = [
  'detected',
  'delivered',
  'clicked',
  'claimed',
  'nothing',
] as const;

export type ProximityEventType = (typeof PROXIMITY_EVENT_TYPES)[number];

export const PRIVACY_COPY_EN =
  'Enable in-store experiences. We use Bluetooth to show relevant offers while you shop in this store. We do not sell your identity to advertisers. You can turn this off anytime. Location-in-store is not required to checkout.';

export const SPOOFING_DISCLOSURE_EN =
  'iBeacon identifiers are public. A nearby device can replay a zone ID. DukaNest v1 does not prove exclusive physical presence. Impressions are counted only when the in-app card is shown on screen after a short dwell. Shoppers with the phone in a pocket, Bluetooth off, or the app uninstalled are not reached. Purchases at till without claiming the offer cannot be measured until a POS or loyalty feed exists. This is not ROAS.';
