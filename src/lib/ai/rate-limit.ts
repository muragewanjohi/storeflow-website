/**
 * Per-tenant-and-feature rate limiting for AI endpoints.
 *
 * Distinct from canUseAiFeature() in subscriptions/limits.ts: this guards
 * against abuse/retry-storms within a plan's allowance (e.g. a user mashing
 * "regenerate" 50 times in a minute), not against exceeding the plan's
 * quota itself. Both checks should run on every AI route.
 *
 * Wraps the existing in-memory checkRateLimit() from
 * @/lib/security/rate-limit rather than reimplementing it. That module also
 * exports getClientIp() for IP-based limiting on unauthenticated endpoints
 * — none of the AI features in docs/AI_FEATURES_PLAN.md are unauthenticated,
 * so this wrapper keys on tenant only; import getClientIp directly from
 * @/lib/security/rate-limit if a future public AI endpoint needs it too.
 */

import { checkRateLimit } from '@/lib/security/rate-limit';
import type { AiFeature } from './types';

const AI_RATE_LIMITS: Record<AiFeature, { limit: number; windowSeconds: number }> = {
  product_description: { limit: 30, windowSeconds: 60 },
  // Collection UX, not generation — same reasoning as onboarding_intake:
  // a real conversation is several turns over a few minutes.
  product_intake: { limit: 20, windowSeconds: 300 },
  expense_categorization: { limit: 60, windowSeconds: 60 },
  analytics_insight: { limit: 10, windowSeconds: 60 },
  theme_styling: { limit: 10, windowSeconds: 60 },
  // Registration-time, unconditional, pre-tenant (same real reason as
  // starter_pack_content/starter_pack_image below: checkAiRateLimit()
  // requires a real tenantId, which doesn't exist yet at this point in
  // registration) — exists only for AI_RATE_LIMITS exhaustiveness, not
  // actually invoked. Registration itself has no per-request rate limiter
  // of its own today (a real, separate gap, not introduced here) — this
  // one extra ~$0.0005 Claude call doesn't materially change that.
  theme_recommendation: { limit: 20, windowSeconds: 3600 },
  photo_qa: { limit: 30, windowSeconds: 60 },
  marketing_image_prompt: { limit: 10, windowSeconds: 60 },
  legal_page_draft: { limit: 5, windowSeconds: 60 },
  delivery_zone_intake: { limit: 30, windowSeconds: 60 },
  // Wider window than the others: a real conversation is several turns
  // (question, answer, question, answer...) over a few minutes, not one
  // isolated action — a per-minute window would be too tight for genuine use.
  onboarding_intake: { limit: 20, windowSeconds: 300 },
  assistant_query: { limit: 20, windowSeconds: 60 },
  // Gemini (onboarding Store Starter Pack) has its OWN, already-live rate
  // limiting in src/app/api/onboarding/starter-pack/route.ts (IP-keyed and
  // tenant-keyed checkRateLimit() calls, since this route can run before a
  // tenant/session exists — checkAiRateLimit() below requires a real
  // tenantId, which this route can't always provide). These entries exist
  // only so AI_RATE_LIMITS stays exhaustive over AiFeature — mirror the
  // starter-pack route's real external-call limit (10/hour) rather than
  // leaving a placeholder, in case this module ever does get wired in for
  // it later.
  starter_pack_content: { limit: 10, windowSeconds: 3600 },
  starter_pack_image: { limit: 10, windowSeconds: 3600 },
};

export interface AiRateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function checkAiRateLimit(tenantId: string, feature: AiFeature): Promise<AiRateLimitResult> {
  const config = AI_RATE_LIMITS[feature];
  const key = `ai:${feature}:tenant:${tenantId}`;
  const result = await checkRateLimit(key, config.limit, config.windowSeconds);
  return { allowed: result.allowed, retryAfterSeconds: result.retryAfterSeconds };
}
