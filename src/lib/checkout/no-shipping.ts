/**
 * Basic services support (docs/SERVICES_PLAN.md, tracker rows S1.1-S1.6).
 *
 * Pure, exported so it's testable in isolation (scripts/test-services-
 * no-shipping.ts) and the exact same decision checkout/route.ts makes,
 * not a re-derived copy. A cart made entirely of non-shipped items
 * (services/digital items) always takes the pickup-equivalent checkout
 * path — no delivery zone, no delivery fee — regardless of what
 * delivery_method the client happened to send. A mixed cart (Phase 1
 * simplification, see the plan doc) still collects shipping normally.
 */
export function computeAllItemsNoShipping(
  items: Array<{ requires_shipping: boolean | null | undefined }>,
): boolean {
  return items.length > 0 && items.every((item) => item.requires_shipping === false);
}
