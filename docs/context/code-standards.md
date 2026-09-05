# Code Standards

Conventions enforced and practiced in this repo. See also `docs/context/architecture.md` and `DEVELOPMENT.md`.

## General

- Keep modules small and domain-focused; put reusable business logic in `src/lib/`, not in route files or page components.
- Fix root causes — avoid layering workarounds on top of broken tenant/auth/data scoping.
- Do not mix unrelated concerns in one component or route (e.g. auth + validation + DB + email in a single handler without extracting helpers).
- Use the `@/` path alias (`@/*` → `src/*`) for all internal imports.
- Prefer extending existing helpers (`requireAuth`, `mobileSuccess`, domain `validation.ts` files) over inventing parallel patterns.

## TypeScript

- **`strict: true`** is required (`tsconfig.json`).
- Type React component props as **`Readonly<Props>`** where props objects are used.
- Avoid `any` for new code; use Prisma-generated types, domain types in `src/lib/auth/types.ts`, or narrow interfaces.
- Validate unknown external input at system boundaries with **Zod** before trusting it (request bodies, query params, webhooks).
- `scripts/` and test files are excluded from the main `tsconfig` — run them via `tsx` / Jest with their own resolution.

## Next.js

- **Default to Server Components** for `page.tsx` — fetch data, enforce auth, pass props to client children.
- Add **`'use client'`** only when the file needs browser APIs, hooks, or event handlers.
- Colocate interactive UI in **`*-client.tsx`** files next to their server `page.tsx` (e.g. `products-list-client.tsx`).
- Use **`export const dynamic = 'force-dynamic'`** on pages that depend on auth/session/tenant context.
- **Route handlers** live in `src/app/api/**/route.ts` — one file per HTTP resource segment; keep handlers focused on HTTP concerns and delegate to `src/lib/`.
- Use **`requireAuthOrRedirect` / `requireAnyRoleOrRedirect`** in dashboard/admin pages; use **`requireAuth()`** (throws) in API routes.

## Styling

- **Tailwind CSS** + **shadcn/ui** (Radix primitives in `src/components/ui/`).
- Use **semantic tokens** from CSS variables — `bg-background`, `text-foreground`, `border-border`, `bg-primary`, etc. Defined as HSL in `src/app/globals.css` and mapped in `tailwind.config.ts`.
- Merge conditional classes with **`cn()`** from `@/lib/utils/cn` (`clsx` + `tailwind-merge`).
- **Lucide React** for icons; match shadcn sizing (`h-4 w-4` inline, `[&_svg]:size-4` on buttons).
- **Dark mode** uses `class` strategy (`darkMode: ["class"]`); storefront themes may override tokens per tenant.
- Add new base UI primitives under `src/components/ui/` (copy `_template.tsx` or use shadcn CLI pattern).

## API Routes

### Web API (`/api/*`)

1. Resolve **auth** (`requireAuth`, role checks) and **tenant** (`requireTenant`, `getTenantFromRequest`) before mutations.
2. Check **write access** where applicable (`requireEditAccess()` from `src/lib/tenant-context/access-control-server`).
3. **Parse and validate** input with Zod schemas from `src/lib/[domain]/validation.ts`.
4. Query via **Prisma** with explicit `tenant_id` in `where` clauses.
5. Return appropriate HTTP status codes; handle **`z.ZodError`** as `400`, auth failures as `401`, tenant/role failures as `403`/`404`.
6. Use **`src/app/api/_template/route.ts`** as the starting point for new routes.

Response shapes vary by route age — newer routes prefer `{ success, data, error }`; older routes may return `{ error }` or `{ products }`. Match the surrounding route family when extending.

### Mobile API (`/api/v1/mobile/*`)

- Auth via **`Authorization: Bearer <token>`** — use `requireMobileAuth()`, `requireMobileTenantStaff()`, or `requireMobileTenantAdmin()`.
- Always respond with **`mobileSuccess()` / `mobileError()`** from `src/lib/api/mobile-response.ts`:

```ts
{ success: true, data: T, pagination?: { page, limit, total, totalPages } }
{ success: false, error: { code, message, details? } }
```

- Reuse the same domain validation and `src/lib/` helpers as web routes; do not duplicate business rules in mobile handlers.
- CORS for mobile paths is handled in `src/middleware.ts`.

## Data and Storage

- **Relational data** → Supabase PostgreSQL via **Prisma**; always scope tenant queries with `tenant_id`.
- **Schema changes** → SQL in `supabase/migrations/`, then regenerate/sync Prisma — do not edit production schema only in Prisma.
- **Files/media** → Supabase Storage via existing upload helpers (`src/lib/media/`, `/api/media/upload`); do not store binary blobs in Postgres.
- **Auth sessions** → Supabase Auth (cookies on web, JWT on mobile); use `src/lib/supabase/server.ts` for server session reads.
- **Cache** → `src/lib/cache/` (in-memory API); invalidate with domain-specific keys/patterns after writes (e.g. product cache tags).

## Client Data Fetching

- Use **TanStack Query** (`useQuery`, `useMutation`, `useQueryClient`) for client-side API calls in dashboard/admin UI.
- Prefer fetching initial list/detail data in the **server page** and passing it as props; use Query for mutations, refetches, and interactive panels.
- Forms in this codebase mostly use **controlled React state** or server actions/fetch — there is no project-wide react-hook-form wrapper yet.

## Security

- Rate-limit sensitive endpoints with `checkRateLimit()` from `src/lib/security/rate-limit.ts`.
- Sanitize user HTML with `src/lib/security/sanitize-html.ts` where rich content is rendered.
- Never expose service-role keys or internal error stacks in production API responses.
- Enforce **subscription/plan limits** via helpers in `src/lib/subscriptions/` before create operations.

## File Organization

| Path | Belongs here |
| ---- | ------------ |
| `src/app/(tenant-storefront)/` | Public storefront pages |
| `src/app/dashboard/` | Tenant dashboard pages + `*-client.tsx` |
| `src/app/admin/` | Landlord admin pages + clients |
| `src/app/api/` | REST handlers (web, mobile, webhooks, cron) |
| `src/lib/[domain]/` | Domain logic, validation, emails, integrations |
| `src/lib/auth/` | Auth helpers, permissions, mobile auth |
| `src/lib/tenant-context/` | Tenant resolution and access control |
| `src/components/ui/` | shadcn base components |
| `src/components/dashboard/`, `admin/`, `shared/`, `themes/` | Feature and layout components |
| `src/themes/` | Storefront theme implementations |
| `supabase/migrations/` | Database schema and RLS migrations |
| `scripts/` | Cron jobs, smoke tests, one-off ops (run with `tsx`) |
| `tests/` | Jest unit tests and Playwright E2E |

## Quality Gates

Run before pushing (also enforced by `.githooks/pre-push` and CI):

```bash
npm run type-check   # tsc --noEmit
npm run lint         # next lint (eslint-config-next)
npm run test         # Jest unit tests
npm run build        # full production build (CI)
```

- **CI** (`.github/workflows/ci.yml`): type-check → lint → test → build on `main` / `dev`.
- **E2E**: `npm run test:e2e` (Playwright, separate from Jest).
- New domain validation schemas belong in `src/lib/[domain]/validation.ts`; add Jest tests under `__tests__/` or `tests/` for non-trivial logic.
