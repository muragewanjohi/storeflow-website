# Selling Services — Plan

**Confirmed scope (from user decision):** support service businesses (salons, barbershops, tailors, consultants) alongside the existing product catalog — not a separate app or a rewrite. **Phase 1** (this doc's near-term target) makes a catalog item sellable without shipping/stock, reusing every existing cart/checkout/order/AI-intake/theme surface. **Phase 2+** (real scheduling) is deliberately out of scope for the first build — see "Why booking is a separate phase" below, which borrows this boundary directly from how Shopify itself draws it.

---

## Current state (confirmed from real code, not assumed)

Everything — `cart_items`, `order_products`, `product_categories`, `product_variants`, `product_reviews`, `product_wishlists` — hangs off a single `products` table ([`prisma/schema.prisma:655`](../prisma/schema.prisma)). There is **no `type`/`is_service` discriminator anywhere in the schema**, and no `booking`/`appointment`/`duration` concept exists in the codebase at all (checked directly across `src/` and `prisma/schema.prisma` — zero matches).

Two pieces of existing infrastructure already accidentally support "not a physical good," discovered by reading the checkout path directly:

- **`stock_quantity: null` already means unlimited.** Checkout's stock check ([`api/checkout/route.ts:204`](../src/app/api/checkout/route.ts)) only fires `if (stockQuantity !== null && stockQuantity < item.quantity)`. A product with no stock tracking already sails through cart → checkout → order with no inventory concept, no schema change needed.
- **`checkout_type: 'pickup'` already exists as an alternative to `'delivery'`** ([`lib/orders/validation.ts:47`](../src/lib/orders/validation.ts)) — no delivery zone, no delivery fee, just name/email/phone/address string. Functionally, this is already most of "redeem in person, no shipment."

And there's real evidence the gap already bites real merchants: [`register/page.tsx`](../src/app/register/page.tsx)'s own business-type list includes *"Beauty & Personal Care — Cosmetics, skincare, hair products, **barbershops, salons**"* — the platform actively onboards service businesses into a product-only, stock-tracked, ship-it catalog model that doesn't fit them today.

---

## What Shopify actually does (researched directly, not assumed — see Sources)

Before designing this, checked how the market leader draws this line, since "sell a service" is a solved problem elsewhere and re-deriving it from scratch would be wasted effort.

**Shopify has no separate "service" entity.** A service is just a regular Product where the merchant unticks **"This is a physical product"** in the Shipping section — which sets `requires_shipping: false` on the variant. That single boolean:
- Removes the shipping-address step and shipping-rate calculation from checkout for that item.
- Leaves everything else about the product form (title, price, description, images, tax settings, inventory-tracking toggle) exactly as-is — no parallel product type, no duplicated form.
- Also happens to cover **digital products** for free (same toggle, same mechanism) — a want DukaNest doesn't have today but gets for nothing by borrowing this design instead of a narrower `type: 'service'` enum.

Mixed carts (a physical item + a `requires_shipping: false` item in the same order) split into separate fulfillment groups at checkout — Shopify's own docs flag this as the one real wrinkle of the "just a boolean" approach.

**Booking/scheduling is deliberately NOT native to Shopify**, even now — it's entirely delegated to third-party apps (Cowlendar, Appointo, Sesami, BookThatApp). What those apps add on top of a plain product, once a merchant actually needs it:
- Time-slot availability + calendar sync (Google/Apple/Outlook) + double-booking prevention
- Staff/resource assignment, staff-facing views of their own appointments
- Deposits, cancellation fees, recurring/package appointments, group bookings
- Automated confirmation/reminder notifications (email/SMS)
- Video-meeting links (Zoom/Meet) for remote services

That a company with Shopify's resources has kept core scheduling out of the core product for years is itself the signal: it's a genuinely separate, harder problem than "sell a non-shipped item," and conflating the two in one build would slow down the part that's actually urgent (a barbershop needs to *list and charge for a haircut* long before it needs a *conflict-free calendar*).

---

## Architecture — Phase 1

### Borrow the boolean, not a new entity

Add `requires_shipping` (boolean, default `true`) to `products` — one migration, every existing row unaffected. This is deliberately **not** a `type: 'product' | 'service'` enum: a `requires_shipping: false` row already fully describes "a service, a voucher, a digital item, anything that doesn't ship," and stays forward-compatible with digital products without another migration later.

Considered and rejected: a parallel `services` table. Given how deeply `products` is threaded through this codebase — cart, checkout, orders, reviews, wishlists, variants, every theme's product-card/detail components, the AI conversational intake (`ai-intake-shared.ts`), both dashboard forms, both mobile apps — a second table means rebuilding nearly all of that twice for the same outcome. The Shopify precedent independently validates the single-field approach: a global platform sells services this way at scale.

### What changes when `requires_shipping = false`

| Surface | Behavior |
|---|---|
| Dashboard/mobile product form | Hide stock-quantity field (or default it to unlimited/disabled), keep everything else (name, price, description, image, category — matches DA.41's now-required category flow unchanged) |
| Checkout | A cart where every item has `requires_shipping: false` skips delivery-zone selection and shipping/delivery fee entirely — reuses the existing lightweight `pickup`-style contact-only address collection already in `checkoutSchema`, rather than inventing a new checkout type |
| Mixed cart (physical + non-physical items) | **Phase 1 simplification, flagged explicitly**: require shipping info if *any* item in the cart needs it — matches Shopify's real "split fulfillment" outcome in spirit (shipping is still collected when needed) without building cart-splitting UI in v1. Revisit only if real usage shows this is confusing |
| Storefront/theme product card | Swap the CTA copy for that item ("Book" vs "Add to Cart") — a **per-item** label driven by `requires_shipping`, not a whole-tenant flag, since a salon plausibly sells both haircuts (service) and hair product (physical) in one catalog |
| AI product intake (`ai-intake-shared.ts`) | Ask "does this need to be shipped?" alongside the existing name/price/category questions; skip the stock-quantity question when the answer is no — same collect-don't-invent discipline as DA.41's category gate |
| Orders / `order_products` | No change needed — already product-agnostic (price, quantity, product_id) |

---

## Why booking is a separate phase

Time-slot scheduling is a genuinely different data shape than anything `products`/`order_products` currently models — a real new entity (`service_bookings`: date/time, optional staff/resource, status), not a field on an existing one. Building it alongside Phase 1 would tie "can a barbershop list a haircut at all" to "can a barbershop run a full calendar," and the second is materially harder (conflict prevention, staff availability windows, reminders) for a need that may not exist for every service-selling merchant — some just want to charge for something intangible with no appointment involved (e.g. a consultation fee paid upfront, a tailoring "rush fee").

**Phase 2 (build only once Phase 1 usage shows real demand for scheduling):**
- New `service_bookings` table: `date`/`time_slot`, optional staff/resource assignment, `status` (`pending`/`confirmed`/`completed`/`cancelled`/`no_show`), linked to `order_id`/`product_id`.
- Dashboard calendar view; time-slot picker on storefront + Flutter.
- Resource-conflict prevention (don't double-book a chair/stylist) — borrowed directly from the Shopify-app feature list above.

**Phase 3 (polish, once Phase 2 is real):**
- Booking reminders reusing the SMS/push infra already built for subscription reminders (DA.36, Ujumbe SMS + `mobile_push_devices`) — no new notification pipeline needed.
- Staff availability windows, cancellation policies, deposits/no-show handling.

---

## Open decisions to make when building (not blocking the plan)

- Exact migration path for `requires_shipping` — SQL-first per this project's own DB workflow (`ALTER TABLE products ADD COLUMN requires_shipping boolean DEFAULT true`, then `npx prisma generate`), not `prisma migrate dev`.
- Whether `requires_shipping` lives on `products` only (simpler, matches most real service catalogs) or also needs a `product_variants` override — Shopify puts it on the variant; DukaNest's variants are much more lightly used today (mostly attribute-based, e.g. size/color), so product-level is likely sufficient for v1 unless a real use case surfaces (e.g. "30-min vs 60-min session" as variants with different shipping-irrelevance — both would be `false` anyway, so this may be moot).
- Exact checkout schema shape for a no-shipping cart — reuse `pickup_address`'s existing fields as-is, or trim to name/email/phone only (no `address` string) since a service redemption may not need any address at all.
- Storefront copy: is "Book" the right default CTA for a `requires_shipping: false` item, or should it stay "Add to Cart" until Phase 2 scheduling actually exists (since Phase 1 has no appointment to "book" yet — might read as broken if it says "Book" but immediately adds to cart with no time picker)?
- Where the AI intake's new "does this need shipping?" question fits relative to the existing category-required gate (DA.41) — likely right after category, before price.

---

## Sequencing

This is new work, not yet started. Suggested order:
1. `requires_shipping` migration + Prisma regen (schema foundation, unblocks everything else)
2. Checkout no-shipping-cart path (highest-value backend change, unblocks both clients)
3. Web dashboard product form + storefront theme CTA changes
4. Flutter product editor + storefront-equivalent changes
5. AI product-intake question update
6. Live-verify: a real service-only order end-to-end (create a `requires_shipping: false` product, add to cart, checkout, confirm no shipping/delivery fields were required or charged)
7. Revisit Phase 2 (real scheduling) only once real merchant demand justifies it — do not build ahead of usage, same discipline already applied to closing out AI Phase 9.1

---

## Sources

- [Shopify Help Center — Selling services or digital products](https://help.shopify.com/en/manual/products/digital-service-product/selling-services-or-digital-products)
- [Shopify — The 9 Best Shopify Appointment Booking Apps (2026)](https://www.shopify.com/blog/appointment-booking-app)
