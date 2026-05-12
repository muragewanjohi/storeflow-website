# Tumizi: mobile app & settings parity (StoreFlow)

This guide maps **web** Tumizi behavior to what a **Flutter (or other) mobile** merchant app should mirror. It complements the low-level partner API doc: [TUMIZI_PARTNER_GATEWAY_API_GUIDE.md](./TUMIZI_PARTNER_GATEWAY_API_GUIDE.md).

---

## What Tumizi is in StoreFlow

- **Customer checkout:** “**M-Pesa via Tumizi**” — automatic STK-style flow; payment is tied to the order and confirmed via webhooks (`/api/tumizi/webhook`).
- **Merchant:** A **Tumizi merchant + wallet** is linked per tenant (`tenant_tumizi_integrations` + optional legacy JSON on `tenants.data`). Enabling Tumizi updates `static_options.payment_tumizi_enabled`.
- **Dashboard:** Two places matter on web:
  1. **Settings → Payments** — cash / M-Pesa toggles, **default payment method** (can be `tumizi` when offered), M-Pesa sub-options.
  2. **Settings → Tumizi** — **Tumizi wallet** switch (calls Tumizi APIs) and the embedded **Tumizi dashboard** (merchant profile, wallet balance, withdrawals, refunds).

---

## Readiness flags (mirror these in the app)

| Surface | Rule | Source |
|--------|------|--------|
| **Storefront checkout** — show Tumizi as a payment option | `payment_tumizi_ready === true` | `GET /api/checkout/settings` on the **store tenant host** (public). Server sets this when `getTumiziTenantConfigByTenantId`: `enabled && merchantExternalId`. |
| **Merchant “Tumizi is live”** | Same: integration **enabled** and **`merchantExternalId`** present | `GET /api/tumizi/settings` (dashboard auth). |
| **Static option “offered”** | `payment_tumizi_enabled` string `'true'` in `static_options` | Written when saving Tumizi via `POST /api/tumizi/settings`; also returned on web `GET /api/dashboard/settings` as boolean `payment_tumizi_enabled`. |

**Web validation (mirror in mobile UI):** Default payment method **`tumizi`** is only allowed if Tumizi is “offered” (`payment_tumizi_enabled` **or** integration live with merchant id). See `src/app/dashboard/settings/tenant-settings-client.tsx` (`tumiziOfferedForValidation`, `tumiziCheckoutReady`).

---

## Web API reference (same host as the tenant store / dashboard)

All paths below are on the **tenant’s app origin** (e.g. `https://{subdomain}.example.com`), unless you proxy them from your API gateway.

### Tumizi integration (enable / disable / create merchant)

| Method | Path | Auth | Role |
|--------|------|------|------|
| `GET` | `/api/tumizi/settings` | Session (`requireAuth`) | `tenant_admin` **or** `tenant_staff` (read) |
| `POST` | `/api/tumizi/settings` | Session | **`tenant_admin` only** |

**`POST` body** (`src/app/api/tumizi/settings/route.ts`):

- `enabled` (boolean, required)
- `merchantExternalId` (optional string) — defaults / generated when creating merchant
- `createMerchantIfMissing` (optional boolean, default `false`) — when `true` and enabling, may call Tumizi **create merchant** + wallet bootstrap

**Response:** `{ success, data }` with `TumiziTenantConfig`-shaped fields (`enabled`, `merchantExternalId`, `walletAccountNumber`, `walletCurrency`, …).

### Merchant profile & wallet actions (dashboard “Tumizi” tab)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| `GET` | `/api/tumizi/merchant` | Session | Merchant + wallet snapshot from Tumizi |
| `PATCH` | `/api/tumizi/merchant` | Session | Update merchant/owner/wallet fields (`updateMerchantSchema`) |
| `GET` | `/api/tumizi/wallet` | Session | Wallet read |
| `POST` | `/api/tumizi/wallet` | Session | Withdrawal create (body per route) |
| `GET` | `/api/tumizi/refunds` | Session | Refund list for tenant |

Implementation entry: `src/app/dashboard/tumizi/tumizi-dashboard-client.tsx` (fetch calls to the routes above).

### General tenant settings (includes payment flags, not full Tumizi object)

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/dashboard/settings` | Session; **`tenant_admin`** only in route |
| `PUT` | `/api/dashboard/settings` | Session; **`tenant_admin`** |

Relevant fields in the flat `settings` object include:

- `payment_cash_enabled`, `payment_mpesa_enabled`, `payment_tumizi_enabled`
- `payment_method` / `default_payment_method` — enum includes **`tumizi`**
- `payment_timing` — affects M-Pesa verification behavior on checkout (see web checkout)

### Staff-initiated Tumizi payment for an existing order

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/orders/:id/tumizi/initiate-payment` | Session; `tenant_admin` / `tenant_staff` |

Body: `phoneNumber` (required), optional `amount`, `narration`. Used from the **order detail** flow on web.

### Storefront (no session)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/checkout/settings` | Includes `payment_tumizi_ready` |
| `POST` | `/api/checkout` | `payment_method: "tumizi"` only if Tumizi live; Kenya M-Pesa phone rules on shipping contact |

---

## Mobile app: mirroring web today

### 1) Authenticated Tumizi APIs = **session cookies**, not mobile Bearer

`/api/tumizi/*` and `/api/dashboard/settings` use **`requireAuth`** (Supabase **cookie** session on the tenant host), **not** `Authorization: Bearer` from `POST /api/v1/mobile/auth/login`.

**Practical options:**

1. **WebView (fastest parity)** — Open `https://{subdomain}.{base}/dashboard/settings` (or deep-link to the Tumizi tab if you add a query hash later) so the merchant uses the **same** web flows and cookies.
2. **Hybrid** — Keep **payment toggles / default method** in the native app (mobile settings now expose Tumizi payment fields); open **WebView only** for Tumizi wallet / withdrawals / refunds until native screens exist.
3. **Future native parity** — Add **`/api/v1/mobile/.../tumizi/*`** proxies that call the same libs as web routes with `requireMobileAuth` (not implemented in this repo yet).

### 2) Mobile settings coverage and remaining gap

`GET/PATCH /api/v1/mobile/dashboard/settings` now exposes payment parity fields:

- `payment.tumiziEnabled` (maps to `payment_tumizi_enabled`)
- `payment.paymentMethod` (maps to `payment_method`, supports `cash | mpesa | tumizi`)
- `payment.defaultMethod` (backward-compatible key, also supports `tumizi`)

Remaining gap for full web parity:

- No Tumizi integration snapshot in mobile settings (`merchantExternalId`, wallet account, currency)
- No dedicated mobile Bearer routes for merchant/wallet/refunds (`/api/v1/mobile/.../tumizi/*`)

For those flows, use WebView on the tenant host (dashboard session), or implement mobile proxy routes.

### 3) Storefront checkout (customer app)

- Host: **storefront tenant domain** (same as web checkout).
- Read **`payment_tumizi_ready`** from `GET /api/checkout/settings`.
- If offering Tumizi, collect a **valid Kenya M-Pesa MSISDN** on shipping/contact (see `normalizeKenyaMsisdnForTumizi` usage in `src/app/api/checkout/route.ts` and checkout client).

---

## UX checklist (merchant app)

| Web | Mobile should |
|-----|----------------|
| Settings → Payments: enable/disable cash / M-Pesa / Tumizi + default method | `GET/PATCH /api/v1/mobile/dashboard/settings` (`payment.cashEnabled`, `payment.mpesaEnabled`, `payment.tumiziEnabled`, `payment.paymentMethod/defaultMethod`) |
| Payments: default method `tumizi` only when offered | Same guard as `tumiziOfferedForValidation` |
| Settings → Tumizi: master switch | `POST /api/tumizi/settings` `{ enabled, createMerchantIfMissing? }` — **admin only** |
| Tumizi tab: merchant / wallet / refunds | `GET`/`PATCH` `/api/tumizi/merchant`, `GET`/`POST` `/api/tumizi/wallet`, `GET /api/tumizi/refunds` — session auth |
| Order detail: initiate Tumizi payment | `POST /api/orders/:id/tumizi/initiate-payment` |

---

## Related code (for engineers)

| Area | Path |
|------|------|
| Tumizi tenant config | `src/lib/tumizi/config.ts` |
| Checkout gate + initiate | `src/app/api/checkout/route.ts`, `src/lib/tumizi/initiate-order-payment.ts` |
| Web settings + Tumizi tab | `src/app/dashboard/settings/tenant-settings-client.tsx` |
| Tumizi dashboard | `src/app/dashboard/tumizi/tumizi-dashboard-client.tsx` |
| Webhook | `src/app/api/tumizi/webhook/route.ts` |

---

## Summary

- **Checkout readiness** for customers = **`payment_tumizi_ready`** (`GET /api/checkout/settings`).
- **Merchant configuration** = **`/api/tumizi/settings`** + **Payments** block in **`/api/dashboard/settings`**.
- **Native mobile** can now mirror Tumizi payment toggles/default from **`/api/v1/mobile/dashboard/settings`**, and should use **WebView + tenant session** for Tumizi-heavy screens (merchant/wallet/refunds) until Bearer-based mobile Tumizi routes are added.
