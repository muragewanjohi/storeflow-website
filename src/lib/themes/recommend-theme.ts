/**
 * AI Phase 4 — Theme Recommendation (docs/AI_FEATURES_PLAN.md, "Claude
 * recommends a layout from the existing built themes based on the
 * merchant's niche/answers, and sets it directly (no separate manual pick
 * required, though the merchant can override)").
 *
 * Real gap this closes: the registration form (src/app/register/page.tsx)
 * has no theme-picker UI at all — confirmed by reading it, not assumed —
 * so `themeId` is never sent by a real merchant, and every registration
 * has always fallen back to the SAME hardcoded "multipurpose"/"grocery"
 * default regardless of business type. This is the direct, confirmed
 * reason literally all 363 real tenant_themes rows on the platform use
 * `grocery` (found live in an earlier session's Theme Track A work) — not
 * because grocery genuinely fits every store, but because nothing else was
 * ever offered. This module doesn't add a picker UI (out of scope for
 * Phase 4 as scoped: "sets it directly... merchant can override" later via
 * the existing Themes page) — it replaces the blind default with a real
 * recommendation.
 *
 * Candidate set is deliberately NOT every `themes` DB row with
 * `status: true` — two rows (`aromatic`, `bookpoint`) have real palettes
 * but zero real components (confirmed in an earlier session's Track A
 * audit), so recommending either would hand a new merchant a broken
 * homepage. The real, authoritative "this theme actually has working
 * components" list is theme-registry.ts's `themeTemplates` keys — the
 * exact same source Track A's own build-order work treats as ground truth.
 */

import { generateJson, type AiUsage } from '@/lib/ai/claude-client';
import { themeTemplates } from '@/lib/themes/theme-registry';

const RECOMMENDABLE_SLUGS = Object.keys(themeTemplates);

/** Safe, general-purpose fallback when nothing matches well, or the AI call fails outright. */
const FALLBACK_THEME_SLUG = 'default';

const recommendThemeSchema = {
  type: 'object',
  properties: {
    themeSlug: { type: 'string' },
    // Short internal note, not shown to the merchant — useful for admin
    // debugging/logging if a recommendation looks off.
    reasoning: { type: 'string' },
  },
  required: ['themeSlug', 'reasoning'],
  additionalProperties: false,
} as const;

interface RecommendThemeRaw {
  themeSlug: string;
  reasoning: string;
}

export interface RecommendThemeResult {
  themeSlug: string;
  reasoning: string;
}

function buildRecommendThemeSystemPrompt(): string {
  const themeList = RECOMMENDABLE_SLUGS.map((slug) => {
    const t = themeTemplates[slug];
    return `"${slug}" (${t.industry} industry — ${t.description})`;
  }).join('; ');

  return [
    'You are picking the best-fitting storefront theme/layout for a new merchant registering on DukaNest, a Kenyan multi-tenant ecommerce platform.',
    `The ONLY available themes are: ${themeList}.`,
    'Pick EXACTLY one theme slug, character-for-character, from this list only — never invent a slug that is not in this list.',
    'Match based on the merchant\'s stated business type/niche. If nothing matches closely (their business type isn\'t one of the covered industries), pick "default" or "minimal" — both are real general-purpose themes suited to any store — rather than forcing a poor industry-specific fit.',
    'reasoning: one short sentence explaining the match, for internal logging only, never shown to the merchant.',
    'Return ONLY valid JSON with no markdown and no extra prose.',
  ].join(' ');
}

/**
 * Real, tiny classification call (~$0.0005/request per AI_FEATURES_PLAN.md)
 * — never trust the returned slug blindly, always re-validated against the
 * real candidate list. Callers MUST still fall back to FALLBACK_THEME_SLUG
 * (or their own existing default) on any thrown error — this must never
 * block registration itself (AI_FEATURES_PLAN.md's guardrails: "No AI
 * feature may ever block a core save/create action on failure").
 */
export async function recommendThemeForBusiness(params: {
  businessType: string | null;
  niche: string | null;
}): Promise<{ data: RecommendThemeResult; usage: AiUsage }> {
  const businessContext = params.businessType
    ? `Business type: "${params.businessType}"${params.niche ? `, niche: "${params.niche}"` : ''}.`
    : 'No business type was given — pick a safe general-purpose default.';

  const { data, usage } = await generateJson<RecommendThemeRaw>({
    system: buildRecommendThemeSystemPrompt(),
    userContent: businessContext,
    schema: recommendThemeSchema,
    maxTokens: 150,
  });

  const themeSlug = RECOMMENDABLE_SLUGS.includes(data.themeSlug) ? data.themeSlug : FALLBACK_THEME_SLUG;
  return { data: { themeSlug, reasoning: data.reasoning }, usage };
}
