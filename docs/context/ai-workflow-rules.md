# AI Workflow Rules

Rules for AI-assisted development on **DukaNest** (`storeflow/`). Read these before implementing; treat `docs/context/` as the source of truth for how to work in this repo.

---

## Approach

Build incrementally using a **spec-driven workflow**:

1. **Understand** — Read `project-overview.md` for scope, then the relevant context file(s) for the area you are touching.
2. **Locate** — Find existing patterns in `src/lib/` and neighboring routes/components before writing new code.
3. **Implement** — Smallest change that satisfies the requirement; match conventions in `code-standards.md` and `ui-context.md`.
4. **Verify** — Run targeted checks (see [Verification](#verification)).
5. **Record** — Update `progress-tracker.md` and any affected context docs.

Do **not** infer product behavior from general ecommerce knowledge. Prefer `docs/ROADMAP.md`, `docs/mobile-first-flutter-roadmap.md`, and the context files over assumptions. For API contracts, check `postman/` and `docs/flutter_apis.md` when mobile is involved.

### Context file map

| File | Use when |
| ---- | -------- |
| `project-overview.md` | Scope, users, goals, what is in/out of scope |
| `architecture.md` | Stack, boundaries, auth, tenant isolation, data access |
| `code-standards.md` | TypeScript, Next.js, API, file organization |
| `ui-context.md` | Dashboard vs marketing vs storefront styling |
| `progress-tracker.md` | Current phase, completed work, open questions |
| `ai-workflow-rules.md` | This file — process and guardrails |

**Repo layout:** This repo is the web platform. Flutter lives in `DukaNest/flutter/` — when a task spans both, clarify which repo is in scope; mobile clients must not duplicate business rules that belong in `src/lib/`.

---

## Scoping Rules

- Work on **one feature unit** at a time (e.g. one API route family, one dashboard page, one migration).
- Prefer **small, verifiable increments** over large speculative refactors.
- **Minimize diff scope** — do not change unrelated files, especially drive-by refactors or extra abstractions.
- Do not combine unrelated system boundaries in one step (dashboard UI + landlord admin + storefront theme in the same change).
- **Match existing patterns** in the target folder before introducing new libraries or architectures.

---

## When to Split Work

Split an implementation step if it combines:

- **UI + schema migration** — ship migration first (or behind a flag), then UI that depends on it.
- **Web API + mobile API** — implement shared logic in `src/lib/` first; wire web and `/api/v1/mobile/*` as separate thin handlers.
- **Multiple unrelated routes or pages** — one PR-sized unit per resource or screen.
- **Behavior not defined** in context files or roadmaps — resolve in `progress-tracker.md` (open question) before coding.
- **Cross-repo changes** (web + Flutter) — backend contract first, then Flutter client, unless explicitly asked to do both.

If the change cannot be verified quickly within its scope, it is too broad — split it.

---

## DukaNest-Specific Guardrails

These invariants from `architecture.md` are non-negotiable:

1. **Tenant scoping** — Every tenant-scoped query/mutation must use a resolved `tenant_id` (middleware, `requireTenant()`, or authenticated user's tenant). Never return cross-tenant data.
2. **RLS / service role** — When using Prisma or service-role Supabase, set RLS context or filter explicitly by `tenant_id`.
3. **Auth before mutation** — `requireAuth` + role checks + `requireEditAccess()` on writes; respect subscription/plan limits via `src/lib/subscriptions/limits.ts`.
4. **Mobile parity** — New dashboard capabilities exposed to shop owners should get a mobile route under `/api/v1/mobile/*` using `mobileSuccess`/`mobileError`, unless the task is explicitly web-only.
5. **Shared business logic** — Rules live in `src/lib/[domain]/`, not duplicated in web and mobile route files.
6. **Schema changes** — Add SQL to `supabase/migrations/`; do not change production schema only in Prisma. Regenerate Prisma after apply.
7. **Secrets** — Never commit `.env`, keys, or credentials. Do not log tokens or PII in production paths.

### UI surface rules

- **Dashboard / admin** → shadcn semantic tokens (`bg-background`, `text-primary`, etc.) — see `ui-context.md`.
- **Marketing pages** → DukaNest brand hex palette (`#0025cc`, `#0c0528`) — do not replace with shadcn tokens on landing sections.
- **Storefront** → theme-specific components under `src/components/themes/`; respect per-tenant injected styles.

---

## Handling Missing Requirements

- Do **not** invent product behavior not defined in context files or roadmaps.
- If ambiguous, check `docs/ROADMAP.md` and `docs/mobile-first-flutter-roadmap.md`; if still unclear, add an **open question** to `progress-tracker.md` and ask the user.
- If implementing a new API used by Flutter, confirm shape against `postman/StoreFlow_Mobile_Tumizi_Collection.json` or main API collection patterns.
- Do not add features marked **out of scope** in `project-overview.md` unless the user explicitly requests them.

---

## Protected Files

Do not modify unless the task explicitly requires it:

| Path | Reason |
| ---- | ------ |
| `src/components/ui/*` | shadcn primitives — extend via composition; use `_template.tsx` or CLI for new primitives |
| `prisma/schema.prisma` | Generated/introspected — change via `supabase/migrations/` then regenerate |
| `.env`, `.env.local`, `env.template` secrets values | Credentials |
| `package-lock.json` | Only when adding/removing dependencies for the task |
| `node_modules/`, `.next/` | Generated |
| Unrelated tenant themes | Do not edit a theme folder unless the task is for that theme |

Avoid editing vendored or third-party internals. Prefer project helpers over forked library code.

---

## Keeping Docs in Sync

Update the relevant file when implementation changes:

| Change | Update |
| ------ | ------ |
| Architecture, auth, tenant model | `architecture.md` |
| Conventions or API patterns | `code-standards.md` |
| Visual tokens, layout, icons | `ui-context.md` |
| Scope, goals, feature status | `project-overview.md` or `docs/ROADMAP.md` |
| Session progress, decisions, blockers | `progress-tracker.md` |
| New/changed mobile API | `postman/` collection + `docs/flutter_apis.md` if contract-visible |
| New migration | filename + purpose noted in `progress-tracker.md` |

Do not create new markdown docs unless the user asks — update existing context files instead.

---

## Verification

Run what applies to the change (narrowest sufficient check):

```bash
npm run type-check          # always for TS changes
npm run lint                # for src/ changes
npm run test                # when touching tested lib logic
npm run build               # before claiming deploy-ready / large refactors
```

- **API routes** — confirm auth, tenant, validation, and error status codes manually or via existing tests.
- **Mobile routes** — response must use `mobileSuccess` / `mobileError` envelope.
- **Migrations** — review SQL for RLS policies and `tenant_id` on new tables.
- **Dashboard UI** — spot-check at **360px** width for mobile-first pages.
- **Do not commit** unless the user explicitly asks.

---

## Before Moving to the Next Unit

1. The current unit works end-to-end within its defined scope.
2. No invariant in `architecture.md` was violated (especially tenant isolation).
3. Code matches `code-standards.md` and the correct UI surface in `ui-context.md`.
4. `progress-tracker.md` reflects completed work, decisions, and any open questions.
5. `npm run type-check` passes; `npm run lint` passes for touched files.
6. If the user will deploy: `npm run build` passes.

---

## Suggested Session Start (for AI)

When resuming or starting a task:

1. Read `progress-tracker.md` — current goal and open questions.
2. Read `project-overview.md` — confirm the task is in scope.
3. Skim `architecture.md` + `code-standards.md` for the area being edited.
4. For UI work, read `ui-context.md` for the correct surface (dashboard / marketing / storefront).
5. Search `src/lib/` for existing domain helpers before writing new logic.
