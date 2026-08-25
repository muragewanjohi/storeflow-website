# AI Features Plan — Claude Haiku 4.5 Integration

**Goal:** Add Claude-powered content generation and a conversational setup flow across the platform — product descriptions, delivery zones, legal pages, product photo QA, theme selection/styling, marketing imagery, and subscription usage monitoring — as a set of independent, cheap, gracefully-degrading features.

See [`THEME_SYSTEM_PLAN.md`](./THEME_SYSTEM_PLAN.md) for the theme system (Track A: layout variety, Track B: styling) in full detail — it's cross-referenced here, not duplicated.

---

## Current state (confirmed from the codebase, not assumed)

- **No Anthropic integration exists anywhere.** The only AI call in the app is the onboarding Store Starter Pack (`src/app/api/onboarding/starter-pack/route.ts`), using Gemini 2.5 Flash for text and a Gemini image model for photos.
- **A real plan-gating precedent already exists** — `hasAdvancedAnalyticsAccess()` in `src/lib/analytics/plan-access.ts` gates 11 features to Pro/Premium by plan name. Reuse this pattern for AI-feature gating.
- **Rate limiting utility already exists** — `checkRateLimit`/`getClientIp` from `@/lib/security/rate-limit`, already used in the starter-pack route. Reuse on every new AI endpoint.
- **Scheduled digest infrastructure already exists** — `analytics/scheduled-reports` + `admin/analytics/send-scheduled-reports` are a ready-made fit for Batch API (50% cheaper, non-latency-sensitive).
- **The starter-pack's bulk onboarding generation caps at 20 products** (`productsCount: z.number().int().min(1).max(20)`, real Zod constraint) — it is a one-time job (`onboarding_starter_packs` table), architecturally separate from ongoing per-product generation. The quota design below mirrors that existing separation.

---

## Architecture decision: generate-then-save, not agentic tool-use

Backend routes collect real data via Prisma → one Claude Haiku 4.5 call returns structured JSON (`output_config.format`, no prefill, no tool-calling loop) → backend code validates and writes the result. Claude never calls your `/api/*` routes itself — same division of labor your Gemini integration already uses, formalized into one shared module.

### Shared infrastructure

| Piece | Purpose |
|---|---|
| `src/lib/ai/claude-client.ts` | Thin Anthropic SDK wrapper — model constant (`claude-haiku-4-5`), retry/timeout, typed errors. One place to swap models per-feature later if quality demands it. |
| `ANTHROPIC_API_KEY` in `.env.example`/`env.template` | Alongside the existing `GEMINI_API_KEY`. |
| `ai_usage_log` table (new Prisma model) | `tenant_id`, `feature`, `bucket` (`'setup' \| 'monthly'`), `input_tokens`, `output_tokens`, `estimated_cost`, `created_at`. Backs quota enforcement, cost monitoring, and usage-based subscription nudges (Phase 8). |
| Extend `PlanLimits` (`src/lib/subscriptions/plan-limits.ts`) | Feature-quota fields, same pattern as `maxProducts`/`maxOrders`. |
| Graceful degradation | Every AI endpoint fails soft — "AI unavailable, continue manually" — never blocks the underlying save/create flow. |

---

## Confirmed setup flow — what's AI and what isn't

Walked through the full store-creation path; this is the accurate scope, not "AI builds the whole store":

| Step | Mechanism | AI's role |
|---|---|---|
| Store name / subdomain | Merchant types store name once; app auto-derives + validates via existing `check-subdomain` | Not really AI — deterministic slugify |
| Product name/price/stock/SKU | **AI conversationally prompts the merchant for these facts** | AI is the collection UX; merchant supplies every value, AI supplies none |
| Product descriptions | Generated from the collected facts | Full generation (Phase 1) |
| Product photos | **Real merchant photos only, always** | Claude vision QA only — quality feedback, alt text, SEO description, reshoot suggestions. **Never generates or alters pixels** — no misrepresentation risk |
| Marketing banners / hero / other images | **AI-generated imagery**, confirmed | Claude writes the image prompt (text) → Gemini image model renders it. Unlike product photos, there's no "real" banner to misrepresent, so generation is appropriate here |
| Theme layout | Claude recommends *and applies* one of the existing built layouts based on niche/answers | Selection + application, not creation (Track A layouts are hand-built) |
| Theme styling (colors/fonts) | Per `THEME_SYSTEM_PLAN.md` Track B | Full generation |
| Delivery zones & fees | AI conversationally prompts for real zone/fee data | Collection UX, same pattern as products |
| Legal pages (terms, privacy, returns) | AI drafts a default; UI requires merchant review before publish | Full generation, review is mandatory, not optional |
| Tumizi payment (KYC, merchant account) | Existing Tumizi API, opt-in | **No AI involvement** — identity/compliance, out of scope by design |
| Domain purchase / DNS | Phase 2 | Out of scope for now |
| Subscription | Usage/due-date monitoring, not selection or payment | Mostly rules-based against `ai_usage_log`; Claude only for nudge copy, if used at all |

---

## Feature rollout

### Phase 1 — Conversational product setup + description generation
- **Flow:** AI prompts the merchant for name/price/stock/category/SKU per product (conversational, not a static form), then generates the description from the collected facts.
- **Data in:** whatever the conversation collects.
- **Endpoint:** `POST /api/products/ai-setup` (collection + generation combined) or split into collection (`ai-intake`) + generation (`ai-description`) if the conversational UI needs to save partial progress.
- **Gating:** setup-bucket allowance during initial store build (see Quotas below); ongoing monthly quota for products added later.
- **Cost:** ~$0.001/product single, ~$0.0008/product batched.

### Phase 2 — Expense auto-categorization
- Unchanged from prior draft. `POST /api/expenses/ai-categorize`. Unlimited, rate-limited only — cost is $0.0004/request, not worth metering.

### Phase 3 — Analytics insight summary
- Unchanged. Pro/Premium, reusing `hasAdvancedAnalyticsAccess()` directly. ~$0.00265/request.

### Phase 4 — Theme recommendation, selection, and styling
- Claude recommends a layout from the existing built themes based on the merchant's niche/answers, and sets it directly (no separate manual pick required, though the merchant can override).
- Styling (colors/fonts) per `THEME_SYSTEM_PLAN.md` Track B2 — sequenced after ≥2 real layouts exist.
- Cost: layout recommendation ~$0.0005/request (small classification-style call); styling ~$0.002–0.0025/request per the theme plan.

### Phase 5 — Product photo QA (not generation)
- **Screen:** product photo upload flow (`api/media/upload`, `api/products/upload`).
- **What it does:** vision analysis of the **real, merchant-uploaded** photo — quality feedback (blurry/dark/wrong aspect ratio), improved alt text, SEO-friendly description, suggested reshoot angles. **Never generates or edits the image itself.**
- **Gating:** available on Basic — this is now core quality-assurance, not a Pro nice-to-have, since it protects against bad first impressions during real setup.
- **Cost:** ~$0.0022/photo (vision, formula: tokens ≈ width×height/750 at a typical 1024×1024 compressed upload).

### Phase 6 — Marketing image generation (banners, hero, other)
- **Confirmed AI-generated.** Claude writes the image prompt (text), the existing Gemini image pipeline renders it — same architecture as the starter-pack's `imagePrompt`/Nano Banana flow, just invoked outside the one-time onboarding job too.
- **Gating:** setup-bucket allowance for initial store build; Pro-tier ongoing quota for later campaign banners (Basic gets a small monthly allowance, e.g. 3–5, since this is more of a "growing store" activity than core setup).
- **Cost:** Claude prompt-writing ~$0.0018 (batched, 7 images/call) + Gemini rendering ~$0.039–0.045/image depending on which Nano Banana model is primary (see `THEME_SYSTEM_PLAN.md` for the primary/fallback cost-swap recommendation).

### Phase 7 — Delivery zones & legal pages
- **Delivery zones:** AI conversationally prompts for real zone/fee data (same collection-UX pattern as Phase 1) — it does not invent coverage areas or courier rates.
- **Legal pages:** AI drafts default terms/privacy/returns text from store type + locale; UI requires explicit merchant review/edit before the page can be published (not a silent auto-publish).
- **Cost:** delivery-zone collection ~$0.0003/zone; legal-page drafting ~$0.001–0.0015/page (3 pages ≈ $0.004, one-time per store).

### Phase 8 — Subscription usage monitoring
- **Not** AI-driven plan selection or payment — a monitoring/notification feature.
- Tracks renewal due-dates and flags when real usage (product count, AI-quota consumption from `ai_usage_log`, order volume) suggests the merchant should upgrade.
- **Mostly rules-based** (SQL against `PlanLimits`/`ai_usage_log`) — Claude is only needed if you want a personalized nudge message rather than a templated one; a static template is cheaper and more predictable, and is the recommended default.
- **Cost:** near-zero (no AI call needed for the detection logic; optional Claude-drafted nudge ~$0.0003/message if used).

### Phase 9 — Scheduled report summaries via Batch API
- Unchanged from prior draft. Reuses existing cron routes, swaps live Messages API for Batch API (50% off). Lowest priority — do once earlier phases have real usage data.

---

## Plan quotas — two buckets, not one counter

Mirrors the real architectural split already in the codebase (`onboarding_starter_packs` as a one-time job vs. ongoing per-item actions):

| Bucket | Scope | Basic | Pro |
|---|---|---:|---:|
| **One-time setup allowance** (tied to store creation) | Product descriptions + product photo QA + marketing images/prompts + theme styling + legal-page drafts + delivery-zone collection, during initial build | 50 descriptions / 50 photo QA passes / 15 marketing images / 5 theme styling passes / 3 legal pages | Same or higher — onboarding success matters on every tier |
| **Ongoing monthly quota** (resets monthly, post-setup) | New products, description regens, new photo QA, occasional new banners | 40 descriptions+photo-QA actions/month, 3–5 marketing images/month | 150/month or effectively unlimited |
| Expense categorization | — | Unlimited, rate-limited only | Same |
| Analytics insights (Phase 3) | — | Not available (matches existing `hasAdvancedAnalyticsAccess()` gate) | 30/month |
| Subscription monitoring (Phase 8) | — | Always on, no quota (near-zero cost, rules-based) | Always on |

**Why the split matters:** a realistic 50-product/7-marketing-image store setup draws entirely from the one-time setup bucket, leaving the 40/month ongoing quota fully available for actual month-to-month use. A single combined counter would let one legitimate onboarding burst consume ~90% of a merchant's *entire first month's* allowance — a bad first impression to design in on purpose, for a cost difference (the whole setup burst is well under $0.50 in real Claude+Gemini spend) too small to justify the risk.

---

## Cost monitoring and guardrails

- **Per-tenant monthly cap**, tied to plan tier, enforced via `ai_usage_log` — soft warning first, hard stop if exceeded.
- **Org-level anomaly alert** — flag if total monthly spend crosses a multiple (e.g. 5×) of the modeled baseline (~$5–17/month across 100–380 merchants at moderate usage per earlier modeling).
- **Batch API wherever UX allows it** — Phase 9 first, revisit others as usage data comes in.
- **No AI feature may ever block a core save/create action on failure.** This is the single most important guardrail across every phase.
