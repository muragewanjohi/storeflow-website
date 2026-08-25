# Onboarding AI Chat — Plan

**Confirmed scope** (from user decisions): a dedicated chat screen, on both web and Flutter, shown as the **first thing after registration** — replacing the existing form-based Store Starter Pack intake as the front door to onboarding. It does **not** replace the Gemini generation pipeline itself — the chat collects the same inputs the form collects today, then hands off to the existing generation logic unchanged.

---

## Current state (confirmed from real code, not assumed)

| Platform | What happens after registration today |
|---|---|
| **Web** | `dashboard/onboarding/starter-pack/page.tsx` — a **form** (business type, niche, store name, locale, currency, product/category/blog counts) that POSTs to `POST /api/onboarding/starter-pack`, which calls Gemini and creates real DB records (products, categories, promotions, theme config). This form is what the chat replaces. |
| **Flutter** | **No onboarding-setup screen exists at all.** `router.dart:634` — after successful registration, the app calls `context.go('/dashboard')` directly. There's an `onboarding_carousel_screen.dart` but it's a pre-registration marketing carousel (`/onboarding` route, shown before signup), not a post-registration setup step. Building the chat here is net-new, not a replacement. |

This asymmetry matters: web work is "swap the intake mechanism," Flutter work is "build a screen that has no precedent in this app."

---

## Architecture

### The chat does not replace Gemini — it replaces the form

`POST /api/onboarding/starter-pack` already does the hard part (generation). Its input contract is exactly the fields the current form collects: `businessType`, `niche`, `storeName`, `locale`, `currency`, `productsCount`, `categoriesCount`, `blogPostsCount`. **The chat's only job is to collect these same fields conversationally, then call this existing endpoint with them — unchanged.** No changes to the Gemini generation logic, the `onboarding_starter_packs` table, or the demo-content pipeline.

### New piece needed: a multi-turn conversational collection endpoint

Every AI feature built so far in this app (product descriptions, and everything in `docs/AI_FEATURES_PLAN.md`) is **single-shot**: one request in, one structured JSON response out, generate-then-save. A chat is fundamentally different — it's **multi-turn**: the model asks a question, the user answers, the model asks the next question (or decides it has enough and finalizes), repeat.

**Design: stateless-per-request, frontend-accumulated history.** Matches how the Messages API itself works (it's stateless — you resend the full conversation each call) and needs no new database table for the conversation itself:

```
POST /api/onboarding/chat
Body: { messages: [{role: 'user'|'assistant', content: string}, ...] }
Response: { reply: string, done: boolean, collected?: { businessType, niche, storeName, locale, currency } }
```

- Each call sends the **full conversation so far** (frontend keeps the array in state — a `useState`/Riverpod provider, not a new backend concept).
- The system prompt instructs Claude to ask one question at a time, stay conversational, and — once it has enough information — respond with `done: true` and the extracted `collected` fields as structured output.
- When `done: true` comes back, the frontend calls the **existing, unmodified** `POST /api/onboarding/starter-pack` with the collected fields, exactly as the form does today.

This is a new `AiFeature` value (`'onboarding_intake'`, added to `src/lib/ai/types.ts`), quota-gated to the **setup bucket only** (a one-time conversation, not a recurring monthly action — `defaultAiPlanLimits()` needs a new field for it, or it can reuse `setup.descriptions`-style budgeting; needs a small decision when building), and rate-limited like every other AI route via the same `guardAiRequest` helper — no new gating pattern, just a new feature key.

### Cost

A typical onboarding conversation is maybe 4-6 exchanges. Each turn re-sends growing history, so later turns cost a bit more than early ones, but at Haiku 4.5 pricing this is still trivial — well under $0.02 for a full conversation, consistent with every other cost figure in this project. Not worth a detailed table; the real cost of this feature is engineering time, not tokens.

---

## Web implementation

1. New route: `storeflow/src/app/onboarding/chat/page.tsx` (or similar — final path TBD when built), replacing the current `dashboard/onboarding/starter-pack/page.tsx` as the post-registration destination.
2. Update `tenants/register` success flow to redirect here instead of the current starter-pack form page.
3. Chat UI component: message thread + input, calling `POST /api/onboarding/chat` per turn.
4. On `done: true`, call the existing `POST /api/onboarding/starter-pack` with `collected` — same as the form's submit handler does today. Reuse that logic; don't duplicate it.
5. Keep the old form accessible somewhere (e.g. a "prefer a form?" fallback link) for merchants who don't want to chat, or for accessibility — worth deciding when building, not blocking the plan.

## Flutter implementation

1. New screen: `flutter/lib/features/onboarding/screens/onboarding_chat_screen.dart`.
2. New route in `router.dart`, inserted between `/register`'s success path and `/dashboard` (currently a direct `context.go('/dashboard')` at line 634 — this becomes `context.go('/onboarding-chat')` or similar, with the chat screen navigating to `/dashboard` itself once `done: true` and the starter-pack call succeeds).
3. Same `POST /api/onboarding/chat` and `POST /api/onboarding/starter-pack` endpoints as web — this is exactly why a shared backend contract matters here: one conversational endpoint serves both clients, no platform-specific backend logic.
4. State management: Riverpod provider holding the message list, matching the app's existing patterns (`flutter_riverpod` already used throughout).

## Reusability beyond onboarding

The tracker already flagged that AI Phase 1.1 (per-product conversational intake) and Phase 7.1 (delivery-zone conversational intake) want the same conversational collection pattern. Building this onboarding chat first is also the natural place to prove out `POST /api/onboarding/chat`'s pattern — a generalized version of it (different system prompt, different target fields, different completion endpoint) is what 1.1 and 7.1 would reuse later, rather than each building its own bespoke chat logic.

---

## Open decisions to make when building (not blocking the plan)

- Exact request/response field names for `POST /api/onboarding/chat` (sketch above is illustrative, not final).
- Whether the old web form stays reachable as a fallback.
- Where `onboarding_intake` fits in `AiPlanLimits` (new field, or reuse an existing one) — small, low-risk decision.
- Loading/error states if Claude is unavailable mid-conversation — must fail soft per the existing guardrail (never block onboarding entirely; a "continue with the form instead" escape hatch is probably the right fallback).

---

## Sequencing

This is new work, not yet started. Suggested order:
1. `POST /api/onboarding/chat` backend endpoint (highest-value, platform-agnostic, unblocks both clients)
2. Web screen (faster to build and test, one codebase already open this session)
3. Flutter screen (net-new, needs its own screen + routing + state provider)
4. Wire registration redirects on both platforms
5. Decide on/build the form-fallback escape hatch
