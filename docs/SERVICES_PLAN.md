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

---

## Deposits / Partial Payments

**Requested directly by the user**, prompted by services being the trigger: *"some services require a deposit to be made, confirm that we have that payment option?"* Confirmed by reading the real payment code — **we don't**. Documented here first per the user's own request, then built as **basic deposit support**: a flat amount or percentage charged at order time via the Tumizi (M-Pesa STK) payment method. Collecting the balance later, and extending this to the manual M-Pesa-till/cash payment methods, are explicit, separate follow-ups — see "Deliberately deferred" below.

### Current state (confirmed from real code)

- `orders.payment_status` takes exactly three real values across the whole codebase: `pending`, `paid`, `refunded` (repo-wide search for every `payment_status = '...'`/`payment_status: '...'` literal). No partial/deposit state exists.
- Both real payment paths charge the full amount, unconditionally: Tumizi's `initiateTumiziCustomerPaymentForOrder` ([`initiate-order-payment.ts:72`](../src/lib/tumizi/initiate-order-payment.ts)) does `const amount = Number(order.total_amount)`; the manual M-Pesa-till flow (`payment_verification` in `checkoutSchema`) just records whatever the customer self-reports against the same `total_amount`.
- A repo-wide search for `deposit`, `partial payment`, `balance_due`, `amount_paid` returns **zero matches** anywhere in `src/` or the Prisma schema.
- **Hard rule already enforced in this codebase, and one this design must not violate**: `checkout/route.ts` creates every order as `payment_status: 'pending'` with the comment *"Never trust client-submitted payment verification payloads for paid status. Payment state is promoted to 'paid' only from verified provider callbacks."* The actual promotion to `'paid'` happens in exactly three real write-paths, all outside `checkout/route.ts` itself: `applyTumiziCustomerPaymentStatus` (a real Tumizi webhook callback), `admin/orders/[id]/verify-payment/route.ts` (a merchant manually approving a customer-submitted M-Pesa till reference — no amount is ever submitted alongside it), and `orders/[id]/route.ts` + its mobile mirror (general order-edit routes a merchant can also use to mark an order paid, e.g. cash — again no amount field). **Only the first of these was made deposit-aware this pass** — see "Deliberately deferred."
- **Real, load-bearing detail found while checking blast radius**: 15+ analytics routes filter `payment_status = 'paid'` for revenue (`analytics/overview`, `analytics/revenue`, `dashboard/overview`, both mobile mirrors, etc.). This is exactly why the design below introduces a **new, distinct** status value rather than overloading `'paid'` — a deposit-only order must not silently count as full revenue.
- **Real, useful infrastructure found while investigating S-Dep.7 (balance collection)**: `orders/[id]/tumizi/initiate-payment/route.ts` (a tenant-admin/staff-only, already-built "retry/collect payment" route) already accepts an arbitrary client-supplied `amount` — it was built for retrying a failed/expired STK push, but it works exactly as-is for a merchant collecting a balance later (`amount: order.balance_amount`), with zero backend changes. Balance collection turned out to need a dashboard **button**, not a new payment mechanism — see the corrected S-Dep.7 scope below.

### Design (as actually built)

**Not `total_amount` redefined — a new pair of fields alongside it.** `orders.total_amount` keeps its existing meaning (the full order value) unconditionally; every place that already reads it (invoices, emails, dashboards, analytics) keeps working unchanged. Two new nullable columns carry the deposit-specific data, `NULL` for every normal (non-deposit) order — zero behavior change for the common case. Applied directly (`supabase/migrations/20260831140000_add_deposit_support.sql`, then `npx prisma generate`):

```sql
ALTER TABLE products ADD COLUMN deposit_type varchar(20) NOT NULL DEFAULT 'none';  -- 'none' | 'fixed' | 'percentage'
ALTER TABLE products ADD COLUMN deposit_value numeric(10,2);                       -- KES amount, or a 0-100 percentage, per deposit_type

ALTER TABLE orders ADD COLUMN deposit_amount numeric(10,2);  -- amount actually charged now; NULL = no deposit involved
ALTER TABLE orders ADD COLUMN balance_amount numeric(10,2);  -- total_amount - deposit_amount; NULL when deposit_amount is NULL
```

- **Where deposits are configured**: per-product, mirroring `requires_shipping`'s own per-item (not whole-tenant) design — a merchant can require a deposit on a booked service while selling hair product outright, in the same catalog.
- **The calculation is a real, exported, testable module** (`@/lib/orders/deposit.ts`), not inlined in the checkout route — `computeLineDepositDue()` per item (a fixed deposit is capped at what that line actually owes, never more than the item's own price; a line with no deposit contributes its full price, same as before) and `computeOrderDeposit()` for the whole cart. Tax and any resolved delivery fee are always charged now alongside the deposit, never deferred — only the item-price portion a merchant explicitly discounted is held back as `balance_amount`.
- **The reduced amount is what gets charged, not `total_amount`.** `checkout/route.ts`'s Tumizi initiation call passes `order.deposit_amount ?? order.total_amount` — no new parameter needed on `initiateTumiziCustomerPaymentForOrder` itself, since it already treats whatever `total_amount` value it's given as "the amount to charge."
- **New `payment_status` value: `'deposit_paid'`.** Resolved by a new `resolveTumiziOrderPaymentStatus()` (`@/lib/tumizi/apply-payment-status.ts`), called from the real Tumizi webhook path only, in place of `'paid'`, whenever the order being confirmed has a non-`NULL` `deposit_amount` — **and the confirmed amount doesn't match the outstanding `balance_amount`** (a real discriminator: it compares what was actually requested at initiation, `payment_logs.amount`, against the order's own `balance_amount`, so a genuine future balance-collection charge correctly resolves to `'paid'`, not a second `'deposit_paid'`). Never decided in `checkout/route.ts` itself, matching the existing "only verified callbacks promote payment state" rule exactly. Because it's a distinct string from `'paid'`, every one of the 15+ existing `payment_status = 'paid'` analytics/revenue queries **needed zero changes** — a deposit-only order simply doesn't count as revenue until the balance is actually collected and the order is flipped to `'paid'`, which is the financially correct behavior, not a workaround.
- **Downgrade guard extended, not the double-charge guard.** `shouldSkipTumiziOrderPaymentDowngrade()` now also protects `'deposit_paid'` orders from a stale/duplicate webhook downgrading them back to `pending`/`failed` (mirroring the protection `'paid'` already had). Deliberately did **NOT** add `'deposit_paid'` to `initiateTumiziCustomerPaymentForOrder`'s existing "already paid" re-initiation guard (`payment_status === 'paid' || 'refunded'`) — doing so would have blocked the exact balance-collection mechanism described above (a merchant legitimately needs to trigger a second Tumizi charge on a `'deposit_paid'` order).

### Deliberately deferred (not built this pass)

- **Manual M-Pesa-till and cash payment methods don't support deposits yet.** Neither has any amount-reporting mechanism today (`verify-payment/route.ts`'s customer-submitted reference carries no amount at all) — making these deposit-aware without knowing what was actually paid would mean guessing, which this codebase's own "never trust unverified payment claims" discipline rules out. Real gap, honestly flagged rather than worked around; needs its own amount-capture design, not assumed away.
- **Storefront/mobile checkout copy** ("Deposit due now: X · Balance due later: Y") and the **dashboard/mobile product-config UI** to actually set `deposit_type`/`deposit_value` on a product — the schema+checkout core lands first, per this project's own established "backend contract, then platforms" sequencing (see `ONBOARDING_AI_CHAT_PLAN.md`). A merchant cannot actually use this feature end-to-end until these land.
- **Balance collection UI** — corrected scope per the finding above: the backend piece already exists (`orders/[id]/tumizi/initiate-payment/route.ts`'s pre-existing `amount` override), so this is now "add a dashboard button that calls the existing route with `amount: order.balance_amount`," not a new payment mechanism.
- **AI product-intake question** ("does this need a deposit?") for `ai-intake-shared.ts`.

### Tracker

| # | Task | Status | Notes |
|---|---|---|---|
| S-Dep.1 | Schema: `products.deposit_type`/`deposit_value`, `orders.deposit_amount`/`balance_amount` | ✅ | Applied to the real dev database directly (SQL-first, then `npx prisma generate`), confirmed via `information_schema.columns` |
| S-Dep.2 | Checkout: compute deposit/balance, charge the reduced amount via Tumizi | ✅ | `@/lib/orders/deposit.ts` (new, exported, testable) + `checkout/route.ts` |
| S-Dep.3 | Tumizi webhook writes `'deposit_paid'` when applicable | ✅ | `resolveTumiziOrderPaymentStatus()` + extended downgrade guard, `@/lib/tumizi/apply-payment-status.ts`. **Scope narrowed from the original plan**: only the Tumizi write-path — see "Deliberately deferred" for why the two manual write-paths were left alone |
| S-Dep.4 | Live-verify the deposit/balance math + guard logic | ✅ | `npm run test:deposit-support`, 17/17 checks, against the real exported functions (not reimplemented copies). No live checkout/STK side effects — same honest ceiling as every other payment-adjacent change this session |
| S-Dep.5 | Dashboard/mobile UI to configure a product's deposit | ✅ | `product-form-client.tsx` (web) + `product_editor_screen.dart` (Flutter) — a deposit-type dropdown + value field next to Cost/Sale Price, both create and edit. `createProductSchema`/`updateProductSchema` already carried the fields (added alongside the schema migration); wiring them through `products/route.ts`'s defensive multi-allowlist pattern (4 separate field lists in one route, guarding against a historical "unexpected column" bug) and the mobile mirror's simpler single-object pattern was the actual work |
| S-Dep.6 | Storefront checkout copy showing deposit vs. balance | ✅ | `checkout-client.tsx` — a live preview computed with the exact same `computeLineDepositDue()`/`computeOrderDeposit()` the real checkout route charges from (imported directly, not reimplemented), so the preview can never drift from what actually gets billed. **"Mobile checkout copy" turned out not to apply**: the Flutter app (`dukanest_app`) is the merchant/store-owner companion app, not a customer storefront — there is no customer-facing mobile checkout to update. What DID need fixing on mobile instead: `orders_list_screen.dart`'s payment-status label/color functions matched `'deposit_paid'` against a generic `.contains('paid')` check and would have shown a merchant "Paid" for a deposit-only order — fixed to check for `'deposit_paid'` explicitly first, both there and in the equivalent web dashboard order list/detail/invoice/email label functions |
| S-Dep.7 | Balance collection UI (dashboard button) | 🔲 | Deferred, but now confirmed small — see the pre-existing `orders/[id]/tumizi/initiate-payment` finding above |
| S-Dep.8 | Extend deposits to the manual M-Pesa-till and cash payment methods | 🔲 | Blocked on those flows gaining any amount-reporting mechanism at all — not just unstarted, genuinely can't be done honestly without one |
