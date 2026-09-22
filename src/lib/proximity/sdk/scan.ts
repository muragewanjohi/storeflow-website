/**
 * Shopper scan surface. Import this from the supermarket consumer app only.
 * Do not import ./commission from that APK.
 */
import {
  DUKANEST_PROXIMITY_UUID,
  PRIVACY_COPY_EN,
  PROXIMITY_DWELL_MS_DEFAULT,
  PROXIMITY_VISIT_STORM_CAP,
} from '../constants';

export type ScanConfig = {
  baseUrl: string;
  scanSdkKey: string;
  opaqueCustomerId: string;
  visitId?: string;
  consent: boolean;
};

export type BeaconSighting = {
  uuid: string;
  major: number;
  minor: number;
  rssi?: number;
};

type ZoneWatch = {
  key: string;
  firstSeenAt: number;
  lastSeenAt: number;
};

export class DukaNestProximityScan {
  private watches = new Map<string, ZoneWatch>();
  private deliveredThisVisit = 0;
  private shownCampaigns = new Set<string>();

  constructor(private readonly config: ScanConfig) {}

  privacyCopy(): string {
    return PRIVACY_COPY_EN;
  }

  platformUuid(): string {
    return DUKANEST_PROXIMITY_UUID;
  }

  /** Call on each iBeacon callback. Does not request an ad until dwell has elapsed. */
  noteSighting(sighting: BeaconSighting, now = Date.now()): { ready: boolean; dwellElapsedMs: number; key: string } {
    const uuid = sighting.uuid.toLowerCase();
    const key = `${uuid}:${sighting.major}:${sighting.minor}`;
    const existing = this.watches.get(key);
    if (!existing) {
      this.watches.set(key, { key, firstSeenAt: now, lastSeenAt: now });
      return { ready: false, dwellElapsedMs: 0, key };
    }
    existing.lastSeenAt = now;
    const dwellElapsedMs = now - existing.firstSeenAt;
    return {
      ready: dwellElapsedMs >= PROXIMITY_DWELL_MS_DEFAULT,
      dwellElapsedMs,
      key,
    };
  }

  async fetchCurrent(sighting: BeaconSighting, dwellElapsedMs: number, source: 'ble' | 'qr' = 'ble') {
    if (!this.config.consent) {
      return { action: 'none', reason: 'consent_required' };
    }
    const params = new URLSearchParams({
      uuid: sighting.uuid,
      major: String(sighting.major),
      minor: String(sighting.minor),
      opaque_customer_id: this.config.opaqueCustomerId,
      consent: String(this.config.consent),
      source,
      dwell_elapsed_ms: String(dwellElapsedMs),
    });
    if (this.config.visitId) params.set('visit_id', this.config.visitId);
    const response = await fetch(`${this.config.baseUrl}/api/v1/proximity/ads/current?${params}`, {
      headers: { Authorization: `Bearer ${this.config.scanSdkKey}` },
    });
    return response.json();
  }

  /**
   * Record a delivered impression only after the card is painted on screen.
   * Pocket detections must stay at event_type=detected.
   */
  async track(body: {
    event_type: 'detected' | 'delivered' | 'clicked' | 'claimed' | 'nothing';
    campaign_id?: string | null;
    uuid?: string;
    major?: number;
    minor?: number;
    impression_on_screen?: boolean;
    source?: 'ble' | 'qr';
  }) {
    if (body.event_type === 'delivered') {
      if (!body.impression_on_screen) {
        throw new Error('Do not send delivered unless the card is on screen.');
      }
      if (this.deliveredThisVisit >= PROXIMITY_VISIT_STORM_CAP) {
        return { skipped: 'storm_cap' };
      }
      if (body.campaign_id && this.shownCampaigns.has(body.campaign_id)) {
        return { skipped: 'already_shown' };
      }
      this.deliveredThisVisit += 1;
      if (body.campaign_id) this.shownCampaigns.add(body.campaign_id);
    }
    const response = await fetch(`${this.config.baseUrl}/api/v1/proximity/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.scanSdkKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        opaque_customer_id: this.config.opaqueCustomerId,
        visit_id: this.config.visitId,
        consent: this.config.consent,
        source: body.source || 'ble',
      }),
    });
    return response.json();
  }

  async claim(campaignId: string) {
    const response = await fetch(`${this.config.baseUrl}/api/v1/proximity/claims`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.scanSdkKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaign_id: campaignId,
        opaque_customer_id: this.config.opaqueCustomerId,
      }),
    });
    return response.json();
  }

  async prefetch() {
    const response = await fetch(`${this.config.baseUrl}/api/v1/proximity/ads/prefetch`, {
      headers: { Authorization: `Bearer ${this.config.scanSdkKey}` },
    });
    return response.json();
  }
}

export { DUKANEST_PROXIMITY_UUID, PRIVACY_COPY_EN };
