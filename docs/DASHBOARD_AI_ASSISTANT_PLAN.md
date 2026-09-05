# Dashboard AI Assistant — Plan

**Confirmed scope:** this becomes the core, ongoing interaction surface where a merchant asks their store questions — not a single-purpose analytics button. It handles three distinct capabilities behind one entry point:

1. **Store data Q&A** — "How many shoes have I sold this month?" — needs a real, precise number, not a summary.
2. **Feature/configuration help** — "How do I set up delivery zones?" — grounded in DukaNest's actual help content, not Claude's general knowledge of what an ecommerce platform probably does.
3. **Configuration guidance** — walking a merchant through setting something up conversationally, reusing the multi-turn pattern already built for onboarding.

This is **additive to, not a replacement of, OC.1** (the onboarding chat). OC.1 stays narrow and one-time (business type/niche, shown once at registration). This assistant is broad and persistent (available throughout the dashboard, asked anything, any time). They can share the same underlying primitive (`generateJsonFromConversation` in `claude-client.ts`, already built) without being the same feature.

---

## Why each capability needs its own architecture, not one generic prompt

Every capability here has the same failure mode if handled naively: **Claude answering from what it can infer, instead of what's actually true for this tenant.** The whole point of this plan is closing that gap per capability.

### 1. Store data Q&A — parse, don't compute

Claude must never be the thing that counts or sums real transactional data — that's a hallucination risk on numbers a merchant might act on. Architecture (still Pattern A — Claude never touches the database):

1. **Claude call — parse intent, not an answer.** Input: the merchant's free-text question. Output: a structured filter against a **small, explicit allow-list** of supported query shapes — not free-form SQL generation, which would be a real safety problem on top of being unnecessary. Start narrow and grow it:
   ```
   { metric: 'units_sold' | 'revenue' | 'orders_count' | 'expenses_total',
     category?: string, productId?: string,
     dateRange: { start: string, end: string } }
   ```
   If the question doesn't map to a supported shape, Claude returns `{ understood: false }` and the assistant says so honestly rather than guessing.
2. **Backend runs a real Prisma aggregate** against that filter. `tenant_id` is injected server-side from the authenticated session — **never** taken from anything Claude returned, same discipline as every RLS policy already audited this session.
3. **Answer with the real number.** A templated sentence is enough ("You've sold 47 pairs of shoes this month"); an optional second Claude call can phrase it more naturally, but the number itself always comes from step 2.

### 2. Feature/help Q&A — retrieval-grounded, not general knowledge

1. **Shortlist candidate articles server-side first**, before Claude sees the question in this context — a simple search over `user_guide_articles` (title/content). The `products` search route already has a working Postgres full-text search pattern (`plainto_tsquery`) that this can reuse directly; a plain `ILIKE` fallback is fine to start with if full-text search isn't wired up for this table yet.
2. **Feed only the shortlisted articles' real content** (top 3-5 matches) to Claude alongside the question, with an instruction to answer *only* from what's given and say so if the docs don't cover it — not fall back to general knowledge.
3. **Cite the source article** in the response (title + link to the real `/help` page) so the merchant can verify or read more. This also makes wrong-article-matched answers self-evidently checkable rather than silently trusted.

### 3. Configuration guidance — reuse OC.1's pattern, don't rebuild it

For "walk me through setting up delivery zones," this is the same multi-turn collection shape as OC.1, just pointed at different target fields and a different completion action (in this case, likely `POST /api/delivery-zones` instead of `POST /api/onboarding/starter-pack`). This is exactly the reuse the tracker already flagged for Phase 7.1 — this assistant becomes the real home for that reuse, not a separate one-off.

---

## Intent routing — one entry point, three handlers

```
POST /api/assistant/chat
Body: { messages: [...] }  (same shape as OC.1)
```

First Claude call classifies intent and either answers directly (for a quick data query) or continues the conversation (for help lookup that needs follow-up, or configuration guidance):

```
{ intent: 'data_query' | 'help_question' | 'configuration_guidance' | 'unclear', ...intent-specific fields }
```

Backend routes to the matching handler from above. `unclear` gets a clarifying question back, not a guess.

---

## Decisions — resolved

1. **Gating: both tiers, quota-differentiated.** Basic gets fewer questions/month, Pro gets more (or effectively unlimited) — same pattern as descriptions/photo-QA, not a hard Pro-only gate. Consistent with calling this "the core" interaction surface.
2. **UI placement: persistent, dashboard-wide.** A chat bubble/panel reachable from any screen, not a dedicated page or per-screen embed. This is a bigger build than a single page — likely a layout-level component, not a route — but matches "the core... where the user interacts with his store."
3. **Search implementation: reuse the existing full-text-search pattern.** `products/route.ts` already has a proven `plainto_tsquery` implementation — copy it for `user_guide_articles` rather than starting with a weaker `ILIKE` fallback. The working pattern already exists in this codebase; there's no reason to deliberately under-build first.
4. **Query allow-list: ship with the four proposed metrics** (`units_sold`, `revenue`, `orders_count`, `expenses_total`). Extend once real usage shows what merchants actually ask.

---

## Relationship to existing phases

| Existing item | Relationship |
|---|---|
| Phase 3 (analytics insight summary, Pro-gated "explain my numbers" button) | Stays as-is — a different UX (proactive one-click summary vs. reactive Q&A). Could eventually be folded into this assistant as one more `intent`, but not required to ship this. |
| Phase 1.1 (product intake) / Phase 7.1 (delivery-zone intake) | This assistant becomes their real home, per the "configuration guidance" capability above — not separate one-off chat builds. |
| OC.1 / onboarding chat | Stays separate and unchanged — narrow, one-time, already shipped. |

---

## Sequencing

Not started. Suggested order once the open decisions above are resolved:
1. `POST /api/assistant/chat` with intent routing — start with just `data_query` and `help_question` (the two concretely scoped capabilities); defer `configuration_guidance` until Phase 1.1/7.1 are ready to plug into it.
2. The four-metric query allow-list + Prisma aggregate handlers.
3. Help-article shortlisting (start with `ILIKE`, upgrade to full-text search if match quality needs it).
4. UI surface, once placement (open decision 2) is resolved.
