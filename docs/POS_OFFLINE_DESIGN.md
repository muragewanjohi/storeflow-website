# Offline-First POS — Design

**Status:** Draft / proposal
**Last updated:** 2026-08-31
**Owner:** TBD
**Related:** `flutter/docs/offline_support_plan.md` (generic offline layer), `storeflow/docs/ROADMAP.md` (POS is new), `docs/mobile-first-flutter-roadmap.md`

---

## 1. Goal

Give a store owner (or staff) a **point-of-sale / counter-sale** flow in the DukaNest
**Flutter app** that:

1. Rings up a walk-in sale — search catalog, add lines, apply discount, take payment, hand over a receipt.
2. **Works with no connectivity** for cash sales: the sale completes locally, a receipt is produced, and the transaction syncs to the server automatically when the device is back online.
3. Records the sale as a first-class `orders` row (channel = `pos`) so it flows into existing orders, analytics, P&L, COGS, and inventory.

**Non-goals for v1**

- Offline card / M-Pesa / Pesapal payments (impossible — see §4).
- Multi-register / multi-cashier reconciliation, cash-drawer shift close-out (Z-report). *(Phase 2.)*
- Multi-location / per-outlet stock. Inventory is a single pool per product today (`products.stock_quantity`); "stock transfer between locations" is unbuilt (ROADMAP §3).
- A web-dashboard POS. The Next.js app is not a PWA; offline POS = Flutter only for now. A thin online-only `/dashboard/pos` page can come later reusing the same endpoint.

---

## 2. What already exists (reuse, don't rebuild)

| Capability | Location |
|---|---|
| Order + line-item model with COGS fields | `orders`, `order_products` (`prisma/schema.prisma:409,433`) |
| Order creation + stock decrement + variant→product stock sync | `src/app/api/checkout/route.ts:385-495` |
| Tax (inclusive/exclusive), invoice numbering | `src/app/api/checkout/route.ts:340-381`, `src/lib/invoices/generate-invoice-number.ts` |
| Order number generator | `src/lib/orders/utils.ts:generateOrderNumber` |
| Inventory adjustment + `inventory_history` audit | `src/lib/inventory/operations.ts` |
| Plan-limit gate for orders | `src/lib/subscriptions/limits.ts:canCreateOrder` |
| Mobile bearer auth for staff + "writes allowed?" gate | `src/lib/auth/mobile-dashboard-tenant.ts` (`requireMobileTenantStaff`, `mobileTenantMustAllowWrites`) |
| Mobile response envelope | `src/lib/api/mobile-response.ts` (`mobileSuccess` / `mobileError`) |
| Customer M-Pesa STK push (online) | `src/lib/tumizi/initiate-order-payment.ts` |
| Flutter API client, Dio + bearer interceptor | `flutter/lib/core/api/api_client.dart` |
| Offline deps already in `pubspec.yaml` | `hive_flutter ^1.1.0`, `connectivity_plus ^7.0.0` |

**Not present, needed:**

- `products.barcode` column (only `sku` exists) — needed for scan-to-add.
- Any local DB / sync engine in Flutter — `offline_support_plan.md` specs it but `lib/core/storage/` and `lib/core/sync/` do not exist yet. **POS is the first consumer that forces us to build it, and it's the easiest possible one because POS sales are append-only.**

---

## 3. Architecture overview

```
┌───────────────────────────  Flutter app  ───────────────────────────┐
│                                                                     │
│  POS screen  ──►  local Sale draft  ──►  [Complete sale]            │
│      ▲                                        │                      │
│      │ reads                                  ▼                      │
│  catalog cache (Hive)                 pos_sales_outbox (Hive)        │
│  tax/payment config cache             status: pending | synced       │
│      ▲                                        │                      │
│      │ refresh when online                    │ SyncManager flush    │
│      │                                         ▼   (on reconnect)    │
└──────┼──────────────────────────────  POST /api/v1/mobile/pos/sales ─┘
       │                                        │  Idempotency-Key = client_sale_id
       ▼                                        ▼
  GET /pos/bootstrap                    upsert orders(channel='pos') by client_sale_id
  (catalog + settings snapshot)         decrement stock, write inventory_history
                                        return canonical order (number, invoice_number)
```

**Core principle:** the client is the source of truth for *what was sold and when*
(append-only, low conflict). The server is the source of truth for *stock levels* and
*canonical identifiers*. Sync reconciles the two.

---

## 4. Offline constraints (decisions, not bugs)

| Constraint | Behavior in v1 |
|---|---|
| **Electronic payment needs connectivity** — STK push routes device → our API → Tumizi → Safaricom. | Offline: only `cash` and `other` (e.g. "customer paid to my own till, ref ____") are selectable. `payment_status='paid'` is set locally by the cashier. **Online (Phase 1, built):** M-Pesa = **Tumizi customer STK**. `create-sale.ts` creates the order `pending` + calls `initiateTumiziCustomerPaymentForOrder`; on STK-init failure it rolls back stock and deletes the order. The app polls `.../tumizi/sync-payment` (and the Tumizi webhook also promotes it) until `payment_status='paid'`. Bootstrap exposes `settings.payments.mpesa_stk_enabled` from the tenant's Tumizi config. |
| **Stock can be oversold** — website + other devices decrement the same counter while a device is offline. | Server applies `decrement` at sync time regardless (arithmetic is safe). If any line goes `< 0`, the sale still succeeds but is flagged; a **"sold below available stock"** report + push alert is generated. Cashier UI shows cached stock with a "may be out of date" hint when offline. |
| **`order_number` / `invoice_number` are server-generated & uniqueness-checked.** | Client generates `client_sale_id` (UUIDv4) + a **display receipt number** `POS-<deviceCode>-<seq>` shown on the printed receipt immediately. Server assigns the real `order_number` / `invoice_number` on sync and returns them; the local record keeps both (`receipt_number` for what the customer holds, `order_number` once known). |
| **Plan order limit (`canCreateOrder`) is server-side.** | Not enforced offline. On sync, if the tenant is over `max_orders`, the POS sale is **still accepted** (the sale already happened in the real world) but the response includes `over_limit: true`; dashboard shows the usual upgrade CTA. Decision: never reject a completed cash sale. |
| **Tax rate / price / coupon config may be stale.** | Sale is computed from the cached snapshot; snapshot carries a `captured_at`. Server does **not** recompute totals on sync (it trusts client line prices, same trust model as `checkout` today which trusts client `items`), but it **does** re-derive `unit_cost_at_sale` / `cogs_total` from current product cost if the client omitted them. |
| **Refunds / voids offline.** | v1: a sale can be **voided locally only before it has synced** (just delete the outbox row). Once synced, refunds go through the existing online order-cancel/refund flow. |

---

## 5. Data model changes

### 5.1 SQL migration (Supabase-first per CLAUDE.md, then `npx prisma generate`)

```sql
-- orders: mark channel + POS metadata + idempotency key
ALTER TABLE orders
  ADD COLUMN channel            varchar(20)  NOT NULL DEFAULT 'online',  -- 'online' | 'pos'
  ADD COLUMN client_sale_id     uuid,                                    -- POS idempotency key
  ADD COLUMN served_by          uuid REFERENCES users(id),               -- staff/owner who rang it
  ADD COLUMN pos_device_label   varchar(100),
  ADD COLUMN amount_tendered    numeric(10,2),
  ADD COLUMN change_due         numeric(10,2),
  ADD COLUMN offline_created_at timestamptz;                             -- real sale time when offline

CREATE UNIQUE INDEX idx_orders_tenant_client_sale_id
  ON orders (tenant_id, client_sale_id)
  WHERE client_sale_id IS NOT NULL;

CREATE INDEX idx_orders_tenant_channel ON orders (tenant_id, channel);

-- optional line-level discount (checkout still has coupons as a TODO; POS needs ad-hoc discounts)
ALTER TABLE order_products
  ADD COLUMN discount_amount numeric(10,2) NOT NULL DEFAULT 0;

-- products + variants: barcode for scan-to-add
ALTER TABLE products         ADD COLUMN barcode varchar(100);
ALTER TABLE product_variants ADD COLUMN barcode varchar(100);
CREATE INDEX idx_products_tenant_barcode         ON products         (tenant_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_product_variants_tenant_barcode ON product_variants (tenant_id, barcode) WHERE barcode IS NOT NULL;
```

**Implemented & applied:** `storeflow/supabase/migrations/20260831120000_add_pos_offline_support.sql`,
mirrored in `prisma/schema.prisma` (client regenerated), applied to the remote `dukanest`
project on 2026-08-31 (migration `add_pos_offline_support`; all existing `orders` rows
backfilled `channel = 'online'`; security advisors clean).

### 5.2 `inventory_history` for POS

Reuse as-is. Write one row per line at sync time with
`adjustment_type = 'sale'`, `reason = 'pos_sale'`, `notes = order_number`,
`adjusted_by = served_by`. (`checkout` currently does **not** write `inventory_history`
for online orders — POS should, and online checkout should be brought in line later.)

---

## 6. Backend — new endpoints

All under `src/app/api/v1/mobile/pos/`, bearer auth via `requireMobileTenantStaff`,
`mobileTenantMustAllowWrites` gate, `mobileSuccess`/`mobileError` envelope.

### 6.1 `GET /api/v1/mobile/pos/bootstrap`

One call the app makes when online to fill/refresh the offline cache.

Returns:
- `products[]` — id, name, sku, barcode, image, price, sale_price, cost_price, stock_quantity, `has_variants`
- `variants[]` — id, product_id, sku, barcode, price, cost_price, stock_quantity, attribute summary
- `settings` — currency, `tax_enabled`, `default_tax_rate`, `tax_pricing_type`, `payment_cash_enabled`, `payment_mpesa_enabled`, Tumizi-live flag, store name/address for receipts
- `captured_at` (server timestamp)

Pagination / delta: accept `?since=<iso>` to return only products changed since last sync
(needs `products.updated_at`, which exists). v1 can start with a full snapshot capped at
plan `max_products` (Basic 100 / Pro 1,000) — fine for a phone.

### 6.2 `POST /api/v1/mobile/pos/sales`

**Idempotent create.** Header `Idempotency-Key: <client_sale_id>` (also in body).

Request body:
```jsonc
{
  "client_sale_id": "uuid",
  "receipt_number": "POS-AB12-000042",
  "offline_created_at": "2026-08-31T14:03:11Z",
  "pos_device_label": "Front counter (Amina's phone)",
  "customer": { "name": "", "phone": "", "email": "" },   // all optional
  "items": [
    { "product_id": "uuid", "variant_id": null, "quantity": 2,
      "unit_price": 250.00, "discount_amount": 0 }
  ],
  "order_discount_amount": 0,
  "payment": { "method": "cash", "status": "paid",
               "amount_tendered": 600.00, "reference": null },
  "notes": ""
}
```

Server logic:
1. `findFirst({ where: { tenant_id, client_sale_id } })` → if found, **return it** (200, same shape). No-op. This is what makes retries safe.
2. Validate every product/variant belongs to the tenant and is not a demo product (same checks as `checkout:134-169`).
3. Recompute `subtotal`, `tax_amount`, `total` from the submitted line prices + submitted discounts + **current** tax settings. Trust line `unit_price` (same trust model as checkout). Derive `unit_cost_at_sale` / `cogs_total` from current product/variant `cost_price`.
4. `generateOrderNumber()` (retry on unique clash), `generateInvoiceNumber(tenant.id)`.
5. Create `orders` row: `channel='pos'`, `status='completed'`, `payment_status` from payload (`paid` for cash), `payment_gateway` = `'cash'` | `'other'` | `'mpesa'`, `checkout_type='pos'`, `delivery_fee=null`, `served_by = user.id`, `client_sale_id`, `offline_created_at`, `amount_tendered`, `change_due`.
6. Decrement stock (reuse the loop from `checkout:461-495` incl. `syncProductStockFromVariants`). Clamp nothing — allow negative, collect `oversold[]`.
7. Write `inventory_history` rows (`adjustment_type='sale'`).
8. `canCreateOrder(tenant)` — **advisory only**: include `over_limit` in response, never block.
9. Fire the same side-effects as checkout where they make sense: merchant "new order" push/SMS is probably **noise** for POS (the merchant *is* the cashier) — default **off**, configurable. TikTok/analytics events: send `Purchase` (it's paid).
10. Response: canonical `{ id, order_number, invoice_number, total, oversold, over_limit }`.

`status` model: POS sales are `completed` immediately (goods handed over). They skip the
`pending → processing → shipped → delivered` chain in `isValidStatusTransition`
(`src/lib/orders/utils.ts:25`) — add `completed` as a recognized terminal status.

### 6.3 `POST /api/v1/mobile/pos/sales/batch` (optional, perf)

Accepts `{ sales: [...] }` (≤ 50), processes each with per-item idempotency, returns
per-item results. Lets the SyncManager flush a backlog in one round trip. Can be added
after v1 if single-flush proves too chatty.

### 6.4 Receipt

Reuse `orders/[id]/invoice/download`. Add a compact **58mm/80mm thermal receipt** HTML/PDF
variant (`?format=receipt`) — store name/address, receipt number, lines, tax line, total,
tendered/change, "served by", timestamp. Flutter prints via `esc_pos` / `blue_thermal_printer`
or shares a PDF. Offline: the app renders the receipt locally from the outbox record
(no server call), using the cached store header from `bootstrap`.

---

## 7. Flutter — offline layer + POS feature

This builds the layer from `flutter/docs/offline_support_plan.md`, scoped to POS.

### 7.1 Storage (`lib/core/storage/`)

- `local_db.dart` — `LocalDb.init()` in `main.dart` before `runApp`. Boxes:
  - `pos_catalog_box` — products + variants snapshot, `capturedAt`. Manual/pull refresh + refresh on POS screen open when online.
  - `pos_settings_box` — tax/payment/store-header snapshot.
  - `pos_sales_outbox_box` — `PosSaleRecord { clientSaleId, receiptNumber, payloadJson, status: pending|syncing|synced|failed, retryCount, createdAt, orderNumber?, invoiceNumber?, oversold? }`.
- `models/pos_sale_record.dart` + Hive adapter (static, `flutter pub run build_runner build`).

### 7.2 Sync (`lib/core/sync/`)

- `sync_manager.dart`:
  - Subscribes to `Connectivity().onConnectivityChanged`; also flush on app resume and after each completed sale (if online).
  - `flush()`: take `pending` rows oldest-first, mark `syncing`, `POST /pos/sales` with `Idempotency-Key`. `2xx` → `synced`, store canonical numbers. `4xx` (validation/tenant mismatch) → `failed` + surface to user, **do not** infinitely retry. `5xx`/timeout → back to `pending`, `retryCount++`, exponential backoff.
  - Serial, not parallel — keeps stock decrements ordered and debuggable.
- `receipt numbering`: `POS-<deviceCode>-<zeroPaddedSeq>`. `deviceCode` = first 4 chars of a per-install UUID (stored in `pos_settings_box`). `seq` is a local monotonic counter. Collisions across devices are cosmetic only (real uniqueness is `order_number`).

### 7.3 API client additions (`lib/core/api/api_client.dart`)

```dart
Future<ApiResponse<dynamic>> getPosBootstrap({String? since});   // implemented
Future<ApiResponse<dynamic>> postPosSale(Map<String, dynamic> body); // implemented
```

`postPosSale` uses `dioPostEnvelope` (like the assistant/subscription calls) so a real
`over_limit` / validation reason surfaces on `response` instead of throwing. **It is
never called directly by the UI** — the UI writes to the outbox; only `SyncManager`
calls it. The server dedupes on the body's `client_sale_id` (no header needed).

### 7.4 Feature module (`lib/features/pos/`)

```
pos/
  data/         pos_repository.dart      (catalog cache read, outbox write, totals math)
                pos_models.dart          (PosLine, PosSaleDraft, PosTotals)
  domain/       pos_totals.dart          (subtotal, line/order discount, tax in/exclusive — port of checkout math)
  presentation/
    screens/    pos_register_screen.dart   (search + grid + cart pane)
                pos_tender_screen.dart     (payment method, tendered, change)
                pos_receipt_screen.dart    (render + print/share, "New sale")
                pos_sales_history_screen.dart (local + synced, sync status chips)
    providers/  pos_catalog_provider.dart
                pos_draft_provider.dart
                pos_outbox_provider.dart   (watches Hive box, exposes pending count)
    widgets/    product_search_field.dart (barcode scan button → mobile_scanner)
                offline_banner.dart, pending_sync_indicator.dart
```

### 7.5 Navigation / gating

- Add "Register" / "POS" to `dashboard_shell.dart`.
- Visible to `tenant_admin` + `tenant_staff`.
- **Plan gate:** POS is a **Pro/Premium** feature. Add `pos_enabled` to `price_plans.features`; check via the subscription snapshot the app already loads. Basic sees an upsell.

### 7.6 New Flutter deps

`mobile_scanner` (barcode), `esc_pos_utils` + `print_bluetooth_thermal` *or* `printing` (PDF share), `uuid` (already transitively present — confirm).

---

## 8. Sync conflict matrix

| Scenario | Resolution |
|---|---|
| Same sale POSTed twice (retry, app killed mid-flush) | `client_sale_id` unique index → 2nd call returns the existing order. Safe. |
| Two offline devices sell the last unit | Both sync; stock goes to `-1`; both sales valid; oversold report flags it. Merchant reconciles stock. |
| Product deleted on web after cached, before sale synced | Sync returns `404` for that line → whole sale `failed`, surfaced to cashier with "Product X no longer exists — record manually / adjust". (Rare; acceptable for v1.) |
| Price changed on web after cache | Sale keeps the **cached price the customer was charged** (client `unit_price` is trusted). Correct behavior. |
| Tenant subscription expired while offline | `mobileTenantMustAllowWrites` → `403` on sync. Outbox row stays `pending`; cashier warned to renew. Sale isn't lost. |
| Clock skew on device | `offline_created_at` is trusted for reporting but server also stores its own `created_at`. Analytics uses `COALESCE(offline_created_at, created_at)`. |

---

## 9. Rollout plan

**Phase 1 — Online POS (no offline), ~1–1.5 wks**
- [x] Migration §5.1 (channel, client_sale_id, served_by, discount, barcode) — `20260831120000_add_pos_offline_support.sql`, schema mirrored, client regenerated. *Remote DB apply pending.*
- [x] `GET /pos/bootstrap` — `src/app/api/v1/mobile/pos/bootstrap/route.ts`
- [x] `POST /pos/sales` (idempotent) — `src/app/api/v1/mobile/pos/sales/route.ts` + `src/lib/pos/{validation,create-sale}.ts`
- [x] Flutter `ApiClient.getPosBootstrap` / `postPosSale` — `flutter/lib/core/api/api_client.dart`
- [x] Flutter `lib/features/pos/` — `data/` (models, cart, totals port, repository), `providers/pos_providers.dart` (bootstrap FutureProvider + cart StateNotifier + totals), `screens/` register → cart → tender → receipt. No Hive; `SyncManager` role played inline by the tender screen calling `postPosSale` directly. Route `/pos` (+ `cart`/`tender`/`receipt`), entry in the More menu. `client_sale_id` = local RFC-4122 v4 UUID (no package). Receipt shared as plain text via `share_plus`.
- [x] Payment methods: **cash** (with change), **"already paid / other"**, and **M-Pesa (Tumizi STK)** — the tender screen shows the M-Pesa option only when `mpesa_stk_enabled`, takes a phone number, then a poll-for-confirmation wait screen (5s × 24 ≈ 2 min) with "resend request" / "I'll confirm later" outs; the receipt shows Paid vs Awaiting.
- [ ] Thermal / PDF receipt variant of the invoice
- [ ] Barcode scan-to-add (needs `mobile_scanner`; text search already matches `barcode`)
- [ ] Plan gate (`pos_enabled` in `price_plans.features`)
- [ ] Add `completed` as a recognized terminal status in `isValidStatusTransition` (`src/lib/orders/utils.ts`) + surface POS/`completed` orders in dashboard + mobile order-status filters
- [x] Tests — `src/lib/pos/__tests__/create-sale.test.ts` (21) + `src/app/api/v1/mobile/pos/__tests__/routes.test.ts` (10): idempotency (dedupe + P2002 race), stock decrement + `inventory_history`, tax inclusive/exclusive, line/order discounts, COGS capture (product + variant), oversell allowed + flagged, demo-store / demo-product / variant-mismatch rejects, plan-limit advisory, change-due, auth gating, payload validation

**Phase 2 — Offline layer, ~1.5–2 wks**
- `lib/core/storage/` + `lib/core/sync/` (the `offline_support_plan.md` layer, POS-scoped).
- Catalog + settings cache, `pos_sales_outbox`, `SyncManager` with backoff.
- Offline banner, pending-sync indicator, local receipt render.
- `POST /pos/sales/batch` if needed.
- Tests: `SyncManager` flush (4xx discard vs 5xx retain), offline sale → reconnect → single order, kill-app-mid-sync → no duplicate.

**Phase 3 — later**
- Cash drawer / shift open-close + Z-report.
- Extend the offline layer to order-status updates and stock adjustments (already scoped in `offline_support_plan.md`).
- Online-only `/dashboard/pos` web page reusing `/pos/sales`.
- Barcode field surfaced in product editor (web + mobile).
- Bring online `checkout` in line: write `inventory_history` on every order.

---

## 10. Open questions

1. **Receipt numbering** — is `POS-<device>-<seq>` acceptable to show customers before sync, or do we want the app to reserve server number blocks (needs a `pos_number_reservations` table)? Proposal: device-seq is fine for v1.
2. **Merchant notifications for POS sales** — off by default? (The cashier already knows.) Proposal: off, with a setting.
3. **Do POS cash sales count toward `max_orders`?** Proposal: yes (they're real orders), but never block — advisory CTA only.
4. **Staff permissions** — can all `tenant_staff` run POS, or a new `pos` capability in the roles system (`dashboard/users/roles`)? Proposal: all staff for v1.
5. **Which plans get POS** — Pro + Premium, or Premium only?
6. **Printer support scope** — Bluetooth thermal only, or also "share PDF receipt via WhatsApp"? Proposal: ship PDF-share first (zero hardware dependency), add Bluetooth thermal in Phase 2.
