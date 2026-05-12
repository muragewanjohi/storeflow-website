/**
 * Checkout shipping: only "delivery_zones" when zones exist; otherwise flat rate.
 * Surfaces a single customer-facing notice when configuration is incomplete.
 */

export type CheckoutEffectiveShippingMethod = 'flat_rate' | 'delivery_zones';

export function parseFlatRateAmount(raw: string | null | undefined): number | null {
  if (raw == null || String(raw).trim() === '') return null;
  const n = parseFloat(String(raw));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export interface CheckoutShippingContext {
  /** What checkout should use for pricing UI and rules. */
  effectiveMethod: CheckoutEffectiveShippingMethod;
  /** Raw value from static_options (may be delivery_zones with zero zones). */
  storedMethodType: string;
  flatRateAmount: number | null;
  /** Stored type was delivery_zones but there are no active zones — treat as flat rate. */
  fellBackFromZonesToFlat: boolean;
  /** Non-null when the shopper should see an explanation banner. */
  customerNotice: string | null;
}

export function getCheckoutShippingContext(input: {
  shippingMethodTypeStored: string | null | undefined;
  activeDeliveryZoneCount: number;
  flatRateAmountRaw: string | null | undefined;
}): CheckoutShippingContext {
  const storedRaw = (input.shippingMethodTypeStored || 'flat_rate').toString();
  const storedMethodType = storedRaw === 'delivery_zones' ? 'delivery_zones' : 'flat_rate';
  const zoneCount = input.activeDeliveryZoneCount;
  const flat = parseFlatRateAmount(input.flatRateAmountRaw);

  const fellBackFromZonesToFlat = storedMethodType === 'delivery_zones' && zoneCount === 0;
  const effectiveMethod: CheckoutEffectiveShippingMethod =
    storedMethodType === 'delivery_zones' && zoneCount > 0 ? 'delivery_zones' : 'flat_rate';

  let customerNotice: string | null = null;
  if (fellBackFromZonesToFlat) {
    customerNotice =
      flat != null
        ? "This store's delivery zones aren't set up yet. The flat delivery fee below applies to your order."
        : "This store's delivery zones aren't set up yet. The store will confirm your delivery cost after you place this order.";
  } else if (effectiveMethod === 'flat_rate' && flat == null) {
    customerNotice =
      'No standard delivery fee is set for this store yet. The store will confirm shipping cost with you after you order.';
  }

  return {
    effectiveMethod,
    storedMethodType,
    flatRateAmount: flat,
    fellBackFromZonesToFlat,
    customerNotice,
  };
}
