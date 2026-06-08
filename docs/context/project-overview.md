# DukaNest

**Slogan:** "Start Your Store. Grow Your Business. It's That Simple."

This repo (`storeflow/`) is the **DukaNest web platform** — multi-tenant backend, landlord admin, tenant dashboard, and customer storefronts. The **Flutter shop-owner app** lives in the sibling repo `DukaNest/flutter/` and consumes `/api/v1/mobile/*` from this codebase.

**Deeper docs:** [README.md](../../README.md) · [docs/ROADMAP.md](../ROADMAP.md) · [docs/mobile-first-flutter-roadmap.md](../mobile-first-flutter-roadmap.md)

---

## Overview

DukaNest is a multi-tenant ecommerce SaaS for small businesses and entrepreneurs — especially sellers already using WhatsApp, Instagram, Facebook, Jiji, or Jumia who want their own professional online store. Each store owner (tenant) gets a branded storefront (`mystore.dukanest.com` or custom domain) and a dashboard to run catalog, orders, customers, payments, and content. Platform owners (landlords) manage tenants, plans, and cross-store operations from a separate admin area.

The product is built **mobile-first** (~84% of traffic is mobile, mostly Android at 360px width) with a native Flutter app on the roadmap so owners can run their shop entirely from a phone.

---

## Goals

1. **Get stores live fast** — Google-first signup, automatic provisioning (Multipurpose theme, default pages, onboarding), free trial.
2. **Run full commerce from one place** — catalog, inventory, orders, customers, promotions, analytics, support, and billing in a single dashboard.
3. **Serve the Kenya market** — M-Pesa STK, Pesapal, Tumizi, delivery zones, and local payment/subscription flows.
4. **Mobile-first operations** — responsive web dashboard, PWA, mobile API, and Flutter shop-owner app for on-the-go management.
5. **Secure multi-tenancy** — strict tenant isolation (RLS + app-level scoping), RBAC, MFA, and plan-based limits.

---

## Core User Flow

### Store owner (tenant)

1. Register via Google or email → choose subdomain → land in dashboard (trial active).
2. Complete onboarding checklist (products, payments, delivery, branding).
3. Manage catalog, orders, customers, and promotions from dashboard (web or mobile app).
4. Customers shop on the tenant storefront; owner fulfills orders and handles support.
5. Subscribe via M-Pesa/Pesapal; upgrade plan as the business grows.

### Customer

1. Visit tenant storefront (subdomain or custom domain).
2. Browse catalog → add to cart → checkout (cash, M-Pesa, Tumizi, etc.).
3. Track orders; create account for order history and support tickets.

### Platform landlord

1. Sign in to `/admin` on the marketing host.
2. Manage tenants, price plans, platform payments, support escalations, and cron operations.

---

## Features

### Multi-Tenant Platform

- Subdomain and custom-domain routing per tenant
- Tenant lifecycle (active, expired, suspended, soft-delete)
- Landlord admin for tenants, plans, users, and platform settings
- Plan limits (staff, products, orders, storage, customers) — partially enforced; see roadmap

### Authentication & Access

- Supabase Auth (email/password, Google OAuth)
- Roles: `landlord`, `tenant_admin`, `tenant_staff`, `customer`
- MFA (OTP), trusted devices, password reset, account recovery
- Mobile Bearer-token auth for `/api/v1/mobile/*`

### Storefront (Customer-Facing)

- Product catalog, categories, collections, product detail
- Cart, checkout, order tracking, customer accounts
- Theme-driven layouts (Multipurpose, Grocery, Modern, Fashion, etc.)
- Blogs, pages, forms, sales/promotions
- SEO: Open Graph, Twitter Cards, Schema.org

### Dashboard (Store Owner)

- Products, categories, attributes, variants, inventory, media library
- Orders, customers, delivery zones, sales/promotions
- Analytics (overview, revenue, traffic, conversion, geographic, realtime, scheduled reports)
- Themes customization and preview
- Blogs, pages, form builder + submissions
- Settings, domains, MFA, subscription, referrals, Tumizi payments
- Help center, contextual tooltips, setup checklist, welcome email series

### Payments & Billing

- M-Pesa STK (checkout + subscription)
- Pesapal (subscription IPN/callbacks)
- Tumizi (merchant onboarding, wallet, refunds)
- Subscription lifecycle, proration, scheduled downgrades

### Mobile & API

- **Phase 0 complete:** `/api/v1/mobile/*` namespace, standardized response envelope, mobile auth, dashboard endpoints, push device registration, media upload
- **Phase 1 largely complete:** mobile bottom nav, responsive dashboard pages, PWA + service worker, camera-first product media
- **Phase 2 in progress:** Flutter shop-owner app (`DukaNest/flutter/`)

### Platform Operations

- Notifications (in-app, email, SMS, push wiring)
- Support tickets (customer ↔ store, store ↔ platform)
- CI: type-check, lint, Jest, Playwright; deployment smoke scripts

---

## Scope

### In Scope (this repo)

- Web platform: marketing site, landlord admin, tenant dashboard, tenant storefronts
- REST API for web UI, webhooks, cron endpoints, and mobile clients
- Supabase Postgres schema, RLS migrations, Prisma client
- Kenya-focused payment integrations (M-Pesa, Pesapal, Tumizi)
- Mobile-first web UX and mobile API foundation
- Documentation, Postman collections, and ops scripts

### In Scope (sibling repo / near-term)

- Flutter shop-owner app (Android first, then iOS) — `DukaNest/flutter/`
- Endpoint parity and hardening for mobile dashboard flows
- Push notifications end-to-end on native clients

### Out of Scope (current phase)

- Flutter **customer** storefront app (Phase 3 — planned)
- Full **offline-first** sync engine with conflict resolution (Phase 4)
- Stripe / PayPal gateway integration (on roadmap, not started)
- Email marketing campaigns, abandoned-cart automation (on roadmap)
- Loyalty programs, gift cards, barcode scanning (on roadmap)
- Multi-store selection per owner account (deferred until product demand)

### Planned Next (from roadmaps)

| Priority | Item | Source |
| -------- | ---- | ------ |
| High | Complete plan-limit enforcement (storage, orders/month, UI upgrade CTAs) | [ROADMAP.md](../ROADMAP.md) |
| High | Flutter MVP — core dashboard ops on phone | [mobile-first-flutter-roadmap.md](../mobile-first-flutter-roadmap.md) |
| Medium | Demo-store theme selector | [ROADMAP.md](../ROADMAP.md) |
| Medium | Deeper social commerce / channel integrations | [ROADMAP.md](../ROADMAP.md) |
| Later | Flutter customer app, offline-first sync | [mobile-first-flutter-roadmap.md](../mobile-first-flutter-roadmap.md) |

---

## Success Criteria

### Platform (shipped / maintaining)

1. A new tenant can register, get a subdomain, and access a working storefront + dashboard within minutes.
2. Tenant data is isolated — no cross-tenant reads or writes.
3. A store owner can manage products, process orders, and view analytics without writing code.
4. Customers can browse, checkout, and pay via supported Kenya payment methods.

### Mobile-first (in progress)

1. Dashboard usable at **360px width** without horizontal scroll on core flows (home, orders, products, settings).
2. Mobile API covers auth, dashboard CRUD, notifications, and media upload with consistent `{ success, data, error }` responses.
3. Flutter shop-owner app: launch **< 3s** on mid-range Android; order management entirely from phone; **> 99%** crash-free rate (targets from mobile roadmap).
4. Push notification delivery **> 95%** once native app is live.

### Growth (targets)

1. Mobile app drives **> 30%** of new tenant signups within 6 months of launch.
2. "Manage from phone" becomes a top-cited reason in user feedback.
3. Measurable reduction in support tickets about mobile limitations.

---

## Related Documentation

| Document | Purpose |
| -------- | ------- |
| [README.md](../../README.md) | Product intro, stack, getting started, implemented feature list |
| [docs/ROADMAP.md](../ROADMAP.md) | Feature backlog, plan limits, onboarding, planned integrations |
| [docs/mobile-first-flutter-roadmap.md](../mobile-first-flutter-roadmap.md) | Mobile phases 0–4, Flutter architecture, success metrics, timeline |
| [docs/context/architecture.md](./architecture.md) | Stack, boundaries, auth, data access (AI context) |
| [docs/context/code-standards.md](./code-standards.md) | Coding conventions (AI context) |
| [docs/context/ui-context.md](./ui-context.md) | Visual system and layout patterns (AI context) |
| [DEVELOPMENT.md](../../DEVELOPMENT.md) | Local setup and dev workflow |
