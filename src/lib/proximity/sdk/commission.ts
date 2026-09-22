/**
 * Staff commissioning surface. Import only from the DukaNest merchant app
 * or a supermarket staff flavor. Never bundle this file in the customer APK.
 */
import { CP35_TX_STEPS_DBM, DUKANEST_PROXIMITY_UUID } from '../constants';

export type CommissionConfig = {
  baseUrl: string;
  commissionSdkKey: string;
};

export class DukaNestProximityCommission {
  constructor(private readonly config: CommissionConfig) {}

  recommendedProfile() {
    return {
      uuid: DUKANEST_PROXIMITY_UUID,
      tx_power_dbm: -13.5,
      adv_interval_ms: 500,
      frames: 'ibeacon_only',
      trigger: 'off',
      default_password_forbidden: ['dx1234', '1234'],
      tx_steps: CP35_TX_STEPS_DBM,
      note: 'Pilot: apply this profile in the DX-SMART app, then PATCH the beacon here. Production: drive GATT from this staff SDK.',
    };
  }

  async applyProfile(body: {
    beacon_id: string;
    uuid?: string;
    major?: number;
    minor?: number;
    tx_power_dbm?: number;
    adv_interval_ms?: number;
    battery_mv?: number;
  }) {
    const response = await fetch(`${this.config.baseUrl}/api/v1/proximity/commission`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.commissionSdkKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return response.json();
  }
}

export { CP35_TX_STEPS_DBM, DUKANEST_PROXIMITY_UUID };
