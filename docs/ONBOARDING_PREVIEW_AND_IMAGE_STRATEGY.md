# Onboarding Preview and Image Strategy

## Overview

This document captures the agreed strategy for making onboarding very smooth while reducing drop-offs:

- New merchants should see a realistic store preview in seconds
- The system should support broad business types (including niche ones)
- Image sourcing must be legally safe
- AI usage should be optional, controlled, and cost-efficient through caching and reuse

---

## Primary Goal

Reduce onboarding drop-off by helping a new merchant quickly reach this state:

1. "This looks like my business"
2. "I only need to update prices"
3. "I can go live quickly"

Success depends on speed, confidence, and minimal required inputs.

---

## Product Principles

1. Template-first, not form-first
2. Preview-first, not settings-first
3. Fast fallback over slow perfection
4. Keep legal compliance explicit
5. Generate once, reuse many times

---

## Recommended Onboarding UX

### Step 1: Business selection

Collect only:

- `business_name` (required)
- `business_type` (required, controlled list)
- `business_subtype` (optional free text, e.g. "flower shop", "handbag boutique")

Why this hybrid approach:

- Controlled type gives consistency for analytics, templates, and defaults
- Free text avoids excluding real-world business types

### Step 2: Instant preview

Immediately render a storefront preview after Step 1:

- Hero/banner image
- Sample product cards
- Basic category sections
- Default color and layout from selected template

Display clear copy:

- "You can change images later"
- "Continue to update prices"

### Step 3: Confirm and continue

Primary CTA:

- "Looks good - continue"

Then route merchant to a simplified setup:

- Product list with editable prices
- Optional "Customize later" path

---

## Image Selection Strategy (Runtime)

Never block onboarding on image generation.

Use this decision order:

1. Exact mapped image by `business_type`/normalized `business_subtype`
2. Similar cached image by semantic similarity/fuzzy match
3. Queue AI generation in background only when no suitable image is found
4. Show fallback stock image immediately while generation runs
5. Replace preview image asynchronously when generation is complete

### Fallback SLA

- First meaningful preview target: < 2 seconds
- Never wait for AI in critical path

---

## AI Usage Strategy

Use AI mainly for:

- Generic hero banners
- Lifestyle scene backgrounds
- Category visuals that are non-branded

Avoid AI for:

- Branded product photos (Samsung, iPhone, etc.) unless usage rights are explicitly verified

Reason:

- Legal risk is higher for branded product imagery
- Merchant trust is better with authentic product photos from approved sources

---

## Legal and Compliance Rules

### Approved image sources

- Owned company image library
- Licensed stock providers
- Supplier/distributor feeds with documented rights
- Official brand media kits with explicit permitted use
- Merchant uploads with rights attestation

### Disallowed source pattern

- Scraping random images from search engines or competitor websites

### Required metadata per image asset

- `source_type` (owned, stock, supplier, brand_kit, ai_generated, merchant_upload)
- `source_ref` (provider URL/id)
- `license_ref` (contract or terms reference)
- `usage_scope` (onboarding_preview, storefront, ads)
- `expiry_at` (nullable)
- `status` (active, restricted, expired, removed)

### Operational safeguards

- Merchant checkbox: confirms ownership/rights for uploaded images
- Takedown workflow: disable flagged image and auto-replace with fallback
- Audit logs for source/license changes

---

## Data Model (Suggested)

### `business_profiles`

- `id`
- `business_name`
- `business_type`
- `business_subtype_raw`
- `business_subtype_key` (normalized canonical key)
- `preview_template_key`
- `preview_asset_id`

### `image_assets`

- `id`
- `asset_type` (hero, category, product)
- `source_type`
- `source_ref`
- `license_ref`
- `usage_scope`
- `status`
- `style_key`
- `hash`
- `width`
- `height`
- `created_at`

### `image_mappings`

- `id`
- `business_type`
- `business_subtype_key`
- `style_key`
- `asset_id`
- `quality_score`
- `is_default`

### `generation_jobs`

- `id`
- `prompt_key`
- `business_subtype_key`
- `style_key`
- `status` (queued, running, complete, failed)
- `provider`
- `model`
- `estimated_cost`
- `actual_cost`
- `result_asset_id`
- `error_message`

---

## Normalization and Matching

Normalize free-text business subtype input before lookup:

- Lowercase
- Trim punctuation/spacing
- Synonym map (e.g. "phone shop", "smartphone store" -> `smartphones`)
- Optional stem/lemmatize by locale

### Mapping strategy (seed first, then learn)

Use a curated existing mapping as the default source of truth for launch:

- Seed known keywords/synonyms to template keys (e.g. `perfume`, `fragrance`, `cologne` -> `perfume_template`)
- Keep this mapping versioned in code or a managed table so behavior is predictable
- Review and expand mappings regularly based on real user input

Auto-learning process after launch:

1. Log unmatched or low-confidence subtype inputs
2. Review these terms weekly (or bi-weekly)
3. Add approved mappings/synonyms to the curated map
4. Reprocess unresolved entries after each mapping update

This approach is preferred over full dynamic generation at launch because it is cheaper, faster, and easier to quality-control.

Similarity matching options:

- Fuzzy keyword match for small dictionaries
- Embedding similarity for larger subtype catalogs

Use threshold gates:

- high confidence -> reuse
- medium confidence -> reuse but mark for review
- low confidence -> background generation

---

## Caching and Cost Control

### Cache key

`cache_key = business_subtype_key + style_key + aspect_ratio + locale`

### Rules

1. Generate only on cache miss
2. Deduplicate by image hash and prompt key
3. Rate-limit per unique subtype per day
4. Pre-generate top business subtypes offline
5. Cap monthly generation budget with circuit breaker fallback

### Budget formula

`monthly_cost = number_of_new_cache_misses * avg_cost_per_generation`

If cache reuse improves, `number_of_new_cache_misses` drops significantly.

---

## Implementation Phases

### Phase 1 (Immediate, low risk)

- Hybrid business selection (controlled type + optional free text)
- Instant preview from existing templates and stock assets
- No AI required in critical path
- "Update prices only" post-onboarding flow

### Phase 2 (Controlled AI + cache)

- Background AI generation for unmapped subtypes
- Cache and reuse pipeline
- Similarity matching and subtype normalization
- Cost tracking dashboard (generation count, cache hit rate, spend)

### Phase 3 (Brand-content integration)

- Supplier/brand feed ingestion with license tracking
- Merchant product-image rights tooling
- Moderation and takedown automation

---

## Metrics and Experiment Plan

Track these KPIs:

- Onboarding completion rate
- Time-to-first-preview
- Step 1 -> Step 2 conversion
- Preview acceptance rate ("Looks good - continue")
- Drop-off before first product price update
- Cache hit rate
- AI generation spend per onboarded merchant

A/B test ideas:

- A: static category image only
- B: static + subtype matching
- C: static + subtype + asynchronous AI replacement

Primary success metric:

- Improvement in onboarding completion and first-week activation

---

## Risk Register

1. Legal misuse of branded images  
   Mitigation: strict source policy + license metadata + takedown flow

2. Slow onboarding due to generation latency  
   Mitigation: never block on AI; always show fallback instantly

3. Cost spikes from unrestricted generation  
   Mitigation: cache, budgets, rate limits, and monthly caps

4. Poor relevance for niche businesses  
   Mitigation: free-text subtype + synonym mapping + iterative library growth

---

## Initial Backlog (Execution Checklist)

- [ ] Add `business_subtype` field in onboarding UI
- [ ] Build subtype normalization service
- [ ] Implement image resolution order with fallback
- [ ] Add async generation queue (non-blocking)
- [ ] Create image metadata schema with license tracking
- [ ] Add merchant rights attestation on upload
- [ ] Add admin takedown and replacement flow
- [ ] Add analytics events for onboarding funnel and preview interactions
- [ ] Build cache hit rate and spend dashboard
- [ ] Run A/B test on preview variants

---

## Default Copy Suggestions

- "Choose your business type"
- "See your store instantly"
- "You can customize this later"
- "Now update your prices and go live"

---

## Decision Summary

Adopt a hybrid onboarding strategy:

- Keep structured business types
- Allow optional free-text subtype
- Render instant preview from templates and cached assets
- Use AI only as asynchronous fallback
- Treat brand product images as licensing-first, not generation-first

This approach best supports smooth onboarding, lower drop-offs, legal safety, and controlled operational cost.
