# Architecture Context

DukaNest is a multi-tenant ecommerce platform. This repo (`storeflow/`) is the **web backend + dashboard + storefront**. The Flutter shop-owner app lives in a sibling repo (`DukaNest/flutter/`) and calls this codebase over HTTP.

For full diagrams and API examples, see `docs/ARCHITECTURE.md`.

## Stack

| Layer | Technology | Role |
| ----- | ---------- | ---- |
| Framework | Next.js 15 (App Router) + React 19 + TypeScript | SSR/SSG pages, API routes, middleware |
| UI | Tailwind CSS + shadcn/ui (Radix) | Dashboard, admin, and shared components |
| Data fetching (client) | TanStack Query | Client-side API calls in dashboard/storefront |
| Auth | Supabase Auth | JWT sessions; cookie-based on web, Bearer tokens on mobile |
| Database | Supabase PostgreSQL + Prisma 7 | Shared DB; Prisma is the primary query layer |
| RLS | Supabase RLS + `set_tenant_context()` RPC | DB-level tenant isolation |
| Storage | Supabase Storage | Product/media/branding uploads |
| Hosting | Vercel | Multi-tenant routing (`*.dukanest.com`, custom domains) |
| Email / SMS | Resend, SendGrid, Ujumbe SMS | Transactional email and OTP delivery |
| Payments | M-Pesa STK, Pesapal, Tumizi | Subscriptions and checkout |
| Mobile client | Flutter (`/api/v1/mobile/*`) | Native shop-owner app |
| Validation | Zod | API input schemas |
| Testing | Jest + Playwright | Unit and E2E |

## System Boundaries

- `src/app/(tenant-storefront)/` — Public tenant storefront (products, blog, collections)
- `src/app/dashboard/` — Tenant owner/staff dashboard (catalog, orders, settings, analytics)
- `src/app/admin/` — Platform landlord admin (tenants, plans, cross-tenant ops)
- `src/app/api/` — REST API for web UI, webhooks, cron endpoints, and mobile (`/api/v1/mobile/*`)
- `src/middleware.ts` — Hostname → tenant resolution, marketing vs tenant routes, mobile CORS
- `src/lib/` — Shared domain logic (auth, tenant context, payments, orders, subscriptions, tumizi, etc.)
- `src/themes/` — Storefront theme components (e.g. Multipurpose); resolved per tenant
- `supabase/migrations/` — Source of truth for schema changes and RLS policies
- `prisma/schema.prisma` — Type-safe DB client (introspected from PostgreSQL)
- `scripts/` — Cron/ops scripts (subscription downgrades, smoke tests, Tumizi tooling)

## Request Surfaces

| Surface | Host / path | Auth |
| ------- | ----------- | ---- |
| Marketing site | `dukanest.com`, `www`, localhost (no default tenant) | Public |
| Tenant storefront | `{subdomain}.dukanest.com` or custom domain | Customer Supabase session |
| Tenant dashboard | Same tenant host, `/dashboard/*` | Tenant admin/staff + MFA |
| Landlord admin | Marketing host or localhost, `/admin/*` | Landlord role |
| Web API | `/api/*` (tenant inferred from host or explicit context) | Session or service checks per route |
| Mobile API | `/api/v1/mobile/*` | `Authorization: Bearer <supabase_access_token>` |

## Storage Model

- **PostgreSQL (Supabase)**: All relational data — tenants, products, orders, customers, subscriptions, settings, analytics. Tenant-scoped tables carry `tenant_id`; RLS enforces isolation.
- **Supabase Storage**: Binary assets — product images, theme branding, support attachments, onboarding media. Paths are tenant-scoped in bucket layout.
- **Cookies / JWT**: Supabase auth session on web; shared auth cookie domain on production (`*.dukanest.com`).
- **In-memory cache** (`src/lib/cache/`): Tenant lookup and hot-path caching locally; same API shape if remote cache is re-enabled later.

## Auth and Access Model

- Users authenticate via **Supabase Auth** (email/password, Google OAuth).
- Roles: `landlord`, `tenant_admin`, `tenant_staff`, `customer` — permissions mapped in `src/lib/auth/permissions.ts`.
- **Tenant staff** are scoped to one `tenant_id`; **landlord** can access platform admin routes.
- **MFA** (OTP via email/SMS) is required for sensitive dashboard flows; trusted-device bypass is supported.
- **Mobile** reuses Supabase tokens; `authenticateMobileRequest()` in `src/lib/auth/mobile-auth.ts` maps JWT → `AuthUser`.
- Service-role Supabase client and Prisma bypass RLS by default — callers must call `setRLSTenantContext(tenantId)` or filter by `tenant_id` explicitly.

## Data Access Pattern

Most server code uses **Prisma** (`src/lib/prisma/client.ts`) against the same Supabase Postgres instance (`DATABASE_URL`).

Supabase clients are used where Supabase-specific features are needed:

- Auth session read/write (`src/lib/supabase/server.ts`, `client.ts`)
- Storage uploads
- RLS context RPC (`src/lib/rls-helpers.ts`)
- Realtime (where enabled)

Schema changes flow: **SQL migration in `supabase/migrations/`** → apply to Supabase → regenerate Prisma client.

## Invariants

1. **Every tenant-scoped read/write must be tied to a resolved tenant** — via middleware headers (`x-tenant-id`), host-based lookup, or authenticated user's `tenant_id`.
2. **Do not query tenant data without RLS context or explicit `tenant_id` filters** when using service-role / Prisma paths.
3. **API route handlers must stay short-lived** — batch/scheduled work belongs in `scripts/` or dedicated cron API routes, not blocking user requests.
4. **Mobile and web dashboard should share business logic in `src/lib/`**, not duplicate rules inside route files.
5. **Hostname is the primary tenant resolver on storefront/dashboard hosts** — cookies are a fallback (e.g. OAuth return to marketing domain), not the source of truth for tenant domains.
