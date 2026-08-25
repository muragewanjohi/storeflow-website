/**
 * Gemini cost estimation — the Claude-side analog of estimateCostUsd()
 * (@/lib/ai/claude-client.ts), for the one real Gemini call site in the
 * app: the onboarding Store Starter Pack
 * (src/app/api/onboarding/starter-pack/route.ts). See
 * docs/IMPLEMENTATION_TRACKER.md, DA.16/DA.17.
 *
 * All prices below are Standard-tier (not Batch — these are live,
 * interactive requests, not the Batch API), sourced from
 * https://ai.google.dev/gemini-api/docs/pricing, fetched 2026-08-24.
 *
 * Image cost is billed from the REAL returned image-token count
 * (usageMetadata.candidatesTokensDetails[IMAGE].tokenCount), not from the
 * resolution the prompt asked for — DA.17 found via a real live call that
 * asking for "4k resolution" in the prompt text does NOT make the model
 * actually deliver 4K pixels (gemini-3.1-flash-image-preview returned a
 * real 1408x768 image, ~1120 tokens, billed at roughly the "1K" tier, not
 * "4K" — the prompt-text resolution instruction is not an enforced API
 * parameter). Billing off real returned tokens is correct regardless of
 * what any future prompt wording asks for; billing off the requested
 * resolution label (this file's original approach) was a real
 * overestimate.
 *
 * Two real gaps, documented rather than silently guessed around:
 *  - `gemini-1.5-flash` (one of the text fallback models) is no longer
 *    listed on the current pricing page — approximated at
 *    gemini-2.5-flash's rate (the closest priced analog) rather than
 *    invented from nothing. Flagged below; rarely exercised in practice
 *    since it's a fallback, only reached if gemini-2.5-flash 404s.
 *  - `gemini-3.1-flash-image-preview` (the default image model in
 *    starter-pack/route.ts) isn't listed separately from the GA
 *    `gemini-3.1-flash-image` — priced identically to the GA model, same
 *    reasoning (preview variants of a model are priced the same as their
 *    GA counterpart unless Google states otherwise; no free-preview claim
 *    is made on the pricing page for this one). Confirmed live: real
 *    responses from this model ARE billed (per usageMetadata) consistent
 *    with gemini-3.1-flash-image's published $60/1M-image-token rate.
 */

export interface GeminiTextUsage {
  promptTokenCount: number;
  candidatesTokenCount: number;
}

// USD per token (Standard tier, text input / text output).
const GEMINI_TEXT_RATES: Record<string, { inputPerToken: number; outputPerToken: number }> = {
  'gemini-2.5-flash': { inputPerToken: 0.3 / 1_000_000, outputPerToken: 2.5 / 1_000_000 },
  // Not on the current pricing page — approximated at gemini-2.5-flash's rate. See module docblock.
  'gemini-1.5-flash': { inputPerToken: 0.3 / 1_000_000, outputPerToken: 2.5 / 1_000_000 },
};

const DEFAULT_TEXT_RATE = GEMINI_TEXT_RATES['gemini-2.5-flash'];

/** USD cost of a Gemini text (JSON-generation) call, from its real usageMetadata token counts. */
export function estimateGeminiTextCostUsd(model: string, usage: GeminiTextUsage): number {
  const rate = GEMINI_TEXT_RATES[model] ?? DEFAULT_TEXT_RATE;
  return usage.promptTokenCount * rate.inputPerToken + usage.candidatesTokenCount * rate.outputPerToken;
}

// USD per image-output token (Standard tier). gemini-3.1-flash-image's
// $60/1M is a directly published rate (ai.google.dev/gemini-api/docs/pricing:
// "$60.00 (images)" per 1M tokens, confirmed to mean candidatesTokensDetails
// IMAGE-modality tokens). gemini-2.5-flash-image has no published per-token
// rate — only a flat "$0.039 per image (1290 tokens)" data point — so its
// rate here is DERIVED (0.039 / 1290 ≈ $30.23/1M), not directly quoted;
// flagged because it's the one number here that isn't a rate Google states
// outright, though it reproduces the published flat price exactly for the
// token count Google's own example uses, and this model has only ever been
// observed (live-tested DA.17) returning that same ~1290-token size.
const GEMINI_IMAGE_PER_TOKEN: Record<string, number> = {
  'gemini-3.1-flash-image-preview': 60 / 1_000_000,
  'gemini-3.1-flash-image': 60 / 1_000_000,
  'gemini-2.5-flash-image': 0.039 / 1290,
};

const DEFAULT_IMAGE_PER_TOKEN = GEMINI_IMAGE_PER_TOKEN['gemini-3.1-flash-image'];

// $0.50/1M tokens (Standard), combined text+image input — gemini-3.1-flash-image's published input rate, applied to every image model here since it's the only one with a distinctly published input rate.
const GEMINI_IMAGE_INPUT_PER_TOKEN = 0.5 / 1_000_000;

/**
 * USD cost of one Gemini image-generation call, billed from the REAL
 * returned image-token count — never from a requested/labeled resolution,
 * which does not reliably predict what the model actually delivers (see
 * module docblock). `imageTokenCount` should come from
 * usageMetadata.candidatesTokensDetails[].tokenCount for modality 'IMAGE'
 * (falling back to the overall candidatesTokenCount is fine for
 * image-only calls, since there's no text output to conflate it with).
 * `promptTokenCount` is best-effort (0 if unavailable) — the output token
 * cost dominates by orders of magnitude, so a missing input count is a
 * rounding error, not a meaningful gap.
 */
export function estimateGeminiImageCostUsd(params: {
  model: string;
  imageTokenCount: number;
  promptTokenCount?: number;
}): number {
  const perTokenRate = GEMINI_IMAGE_PER_TOKEN[params.model] ?? DEFAULT_IMAGE_PER_TOKEN;
  const outputCost = params.imageTokenCount * perTokenRate;
  const inputCost = (params.promptTokenCount ?? 0) * GEMINI_IMAGE_INPUT_PER_TOKEN;
  return outputCost + inputCost;
}
