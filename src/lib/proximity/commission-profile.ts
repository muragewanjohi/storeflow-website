import { z } from 'zod';
import { CP35_TX_STEPS_DBM, DUKANEST_PROXIMITY_UUID, isAllowedCp35Tx } from './constants';

export const commissionBodySchema = z.object({
  beacon_id: z.string().uuid(),
  uuid: z.string().uuid().optional(),
  major: z.number().int().min(0).max(65535).optional(),
  minor: z.number().int().min(0).max(65535).optional(),
  tx_power_dbm: z.number().optional(),
  adv_interval_ms: z.number().int().min(100).max(1500).optional(),
  battery_mv: z.number().int().optional(),
  last_seen_at: z.string().optional(),
});

export type CommissionBody = z.infer<typeof commissionBodySchema>;

type ExistingBeacon = {
  major: number;
  minor: number;
  tx_power_dbm: unknown;
  adv_interval_ms: number;
  battery_mv: number | null;
};

function txPowerDbm(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    const numeric = value.toNumber();
    if (typeof numeric === 'number' && Number.isFinite(numeric)) return numeric;
  }
  return fallback;
}

/** Fields written after staff apply the CP35 profile. Does not talk to the radio. */
export function commissionUpdate(existing: ExistingBeacon, body: Omit<CommissionBody, 'beacon_id'>, now = new Date()) {
  if (body.tx_power_dbm !== undefined && !isAllowedCp35Tx(body.tx_power_dbm)) {
    throw Object.assign(new Error(`TX must be one of ${CP35_TX_STEPS_DBM.join(', ')}`), { status: 400 });
  }
  return {
    ibeacon_uuid: (body.uuid || DUKANEST_PROXIMITY_UUID).toLowerCase(),
    major: body.major ?? existing.major,
    minor: body.minor ?? existing.minor,
    tx_power_dbm: body.tx_power_dbm ?? txPowerDbm(existing.tx_power_dbm, -13.5),
    adv_interval_ms: body.adv_interval_ms ?? existing.adv_interval_ms,
    battery_mv: body.battery_mv ?? existing.battery_mv,
    last_seen_at: body.last_seen_at ? new Date(body.last_seen_at) : now,
    updated_at: now,
  };
}
