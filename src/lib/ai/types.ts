/**
 * Shared AI feature identifiers.
 *
 * Defined once here and imported by everything that needs to key on a
 * feature (usage logging, quota checks, rate limiting) so the feature list
 * can't drift between those three concerns. Matches the `feature` values
 * documented in prisma/schema.prisma's `ai_usage_log` model comment.
 */
export type AiFeature =
  | 'product_description'
  | 'product_intake'
  | 'expense_categorization'
  | 'analytics_insight'
  | 'theme_styling'
  | 'photo_qa'
  | 'marketing_image_prompt'
  | 'legal_page_draft'
  | 'delivery_zone_intake'
  | 'onboarding_intake'
  | 'assistant_query'
  // Gemini — the onboarding Store Starter Pack
  // (src/app/api/onboarding/starter-pack/route.ts), the only real Gemini
  // call site in the app. See @/lib/ai/gemini-cost.ts for pricing.
  | 'starter_pack_content'
  | 'starter_pack_image';

export type AiUsageBucket = 'setup' | 'monthly';

/** Which AI provider a usage row/quota check belongs to. Defaults to 'claude' everywhere it isn't passed — see recordAiUsage() (@/lib/ai/usage.ts). */
export type AiProvider = 'claude' | 'gemini';
