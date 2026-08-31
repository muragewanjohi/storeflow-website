/**
 * Basic deposit support (docs/SERVICES_PLAN.md, tracker rows S-Dep.1-S-Dep.7).
 *
 * Pure, exported calculation core so it's both testable in isolation
 * (scripts/test-deposit-support.ts) and reusable by a future storefront
 * "you'll pay X now, Y later" preview (S-Dep.6) without re-deriving the
 * formula. checkout/route.ts is the only real caller today.
 */

export type DepositType = 'none' | 'fixed' | 'percentage';

/**
 * A fixed deposit is capped at what the line actually owes (can never
 * exceed itemTotal); a line with no deposit configured contributes its
 * full price, same as before this feature existed.
 */
export function computeLineDepositDue(
  itemTotal: number,
  depositType: string | null | undefined,
  depositValue: unknown,
): number {
  const value = depositValue != null ? Number(depositValue) : null;
  if (depositType === 'percentage' && value != null) {
    return itemTotal * (value / 100);
  }
  if (depositType === 'fixed' && value != null) {
    return Math.min(value, itemTotal);
  }
  return itemTotal;
}

export interface OrderDepositResult {
  /** Amount to actually charge now. NULL when no deposit is involved (the common case) — total_amount keeps its existing meaning unconditionally. */
  depositAmount: number | null;
  /** total_amount - depositAmount. NULL exactly when depositAmount is NULL. */
  balanceAmount: number | null;
}

/**
 * Tax and any resolved delivery fee are always charged now alongside the
 * deposit, never deferred — only the item-price portion a merchant
 * explicitly discounted via deposit_type is held back as balance.
 */
export function computeOrderDeposit(params: {
  itemsSubtotal: number;
  depositSubtotal: number;
  taxAmount: number;
  deliveryFee: number | null;
  finalTotal: number;
}): OrderDepositResult {
  const { itemsSubtotal, depositSubtotal, taxAmount, deliveryFee, finalTotal } = params;
  const hasDeposit = depositSubtotal < itemsSubtotal - 0.01;
  if (!hasDeposit) {
    return { depositAmount: null, balanceAmount: null };
  }
  const depositAmount = depositSubtotal + taxAmount + (deliveryFee ?? 0);
  return { depositAmount, balanceAmount: finalTotal - depositAmount };
}
