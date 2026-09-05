/**
 * Withdrawal fee tiers and max-withdrawable math (shared by `/api/tumizi/wallet` and the dashboard).
 */

export type WithdrawalChargeTier = {
  min: number;
  max: number;
  charge: number;
};

export const WITHDRAWAL_CHARGE_TIERS: WithdrawalChargeTier[] = [
  { min: 1, max: 100, charge: 0 },
  { min: 101, max: 500, charge: 6 },
  { min: 501, max: 1000, charge: 12 },
  { min: 1001, max: 1500, charge: 20 },
  { min: 1501, max: 2500, charge: 30 },
  { min: 2501, max: 5000, charge: 40 },
  { min: 5001, max: 10000, charge: 55 },
  { min: 10001, max: 35000, charge: 60 },
  { min: 35001, max: 250000, charge: 68 },
];

export function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function getChargeForAmount(amount: number): number {
  const tier = WITHDRAWAL_CHARGE_TIERS.find((row) => amount >= row.min && amount <= row.max);
  return tier?.charge ?? WITHDRAWAL_CHARGE_TIERS[WITHDRAWAL_CHARGE_TIERS.length - 1].charge;
}

export function getMaxWithdrawable(availableBalance: number): { amount: number; charge: number } {
  let bestAmount = 0;
  let bestCharge = 0;
  for (const tier of WITHDRAWAL_CHARGE_TIERS) {
    const candidateAmount = Math.min(tier.max, Math.floor(availableBalance - tier.charge));
    if (candidateAmount >= tier.min && candidateAmount + tier.charge <= availableBalance) {
      if (candidateAmount > bestAmount) {
        bestAmount = candidateAmount;
        bestCharge = tier.charge;
      }
    }
  }
  return { amount: Math.max(0, bestAmount), charge: Math.max(0, bestCharge) };
}

export function getMinimumWithdrawalWithCharge(): number {
  const withCharge = WITHDRAWAL_CHARGE_TIERS.filter((t) => t.charge > 0);
  if (withCharge.length === 0) return 100;
  return Math.min(...withCharge.map((t) => t.min));
}
