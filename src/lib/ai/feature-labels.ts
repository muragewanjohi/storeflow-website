/**
 * Human labels for AiFeature (@/lib/ai/types.ts) — shared so the admin AI
 * Usage page (src/app/admin/ai-usage/ai-usage-client.tsx) and the
 * usage-vs-limit upgrade nudges (src/lib/subscriptions/ai-quota-warnings.ts,
 * AI Phase 8.2) show the exact same wording for the same feature, rather
 * than two independently-drifting copies.
 */

import type { AiFeature } from './types';

export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
  product_description: 'Product descriptions',
  product_intake: 'Conversational product intake',
  expense_categorization: 'Expense auto-categorization',
  analytics_insight: 'Analytics insight summaries',
  theme_styling: 'Theme styling',
  photo_qa: 'Product photo QA',
  marketing_image_prompt: 'Marketing image prompts',
  legal_page_draft: 'Legal page drafts',
  delivery_zone_intake: 'Delivery zone setup',
  onboarding_intake: 'Onboarding chat',
  assistant_query: 'Dashboard AI Assistant',
  starter_pack_content: 'Store Starter Pack — content',
  starter_pack_image: 'Store Starter Pack — images',
};

export function aiFeatureLabel(feature: string): string {
  return (AI_FEATURE_LABELS as Record<string, string>)[feature] ?? feature;
}
