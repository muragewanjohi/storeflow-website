/**
 * Onboarding AI Chat — shared core (OC.1/OC.3).
 *
 * Extracted from src/app/api/onboarding/chat/route.ts so the mobile mirror
 * (src/app/api/v1/mobile/onboarding/chat/route.ts, OC.3) runs the exact same
 * system prompt, response schema, and turn logic as web — the same
 * "shared core, thin platform routes" pattern @/lib/assistant/shared already
 * established for the dashboard AI assistant. Nothing about the Claude
 * prompt is forked or duplicated for mobile.
 */

export const ONBOARDING_CHAT_MAX_MESSAGES = 40; // generous for a real conversation; a hard stop against unbounded/abusive threads

export const onboardingChatResponseSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    done: { type: 'boolean' },
    collected: {
      type: 'object',
      properties: {
        businessType: { type: ['string', 'null'] },
        niche: { type: ['string', 'null'] },
      },
      required: ['businessType', 'niche'],
      additionalProperties: false,
    },
  },
  required: ['reply', 'done', 'collected'],
  additionalProperties: false,
} as const;

export interface OnboardingChatTurnResponse {
  reply: string;
  done: boolean;
  collected: { businessType: string | null; niche: string | null };
}

export function buildOnboardingChatSystemPrompt(storeName?: string, knownBusinessType?: string): string {
  return [
    'You are a friendly onboarding assistant for DukaNest, a Kenyan multi-tenant ecommerce platform.',
    knownBusinessType
      ? `You already know the merchant's businessType: "${knownBusinessType}". Do not ask for it again — you may confirm it naturally in your first message, but your only real job now is finding out their niche (their specific focus within it, e.g. "women's handbags", "phone accessories", "organic produce"). Always return businessType as exactly "${knownBusinessType}" in collected.`
      : 'Your job in this conversation is to find out two things: businessType (a general category, e.g. "fashion", "electronics", "grocery") and niche (their specific focus within it, e.g. "women\'s handbags", "phone accessories", "organic produce").',
    'Ask one short, friendly question at a time. Do not ask about pricing, products, delivery, themes, or anything else — those come later in separate steps.',
    storeName
      ? `The merchant's store is already named "${storeName}" — do not ask for it, you may reference it naturally.`
      : undefined,
    knownBusinessType
      ? 'Once you clearly have niche, set done to true, fill in collected (businessType as given above, niche as discovered), and set reply to a short (max 2 sentences) friendly confirmation.'
      : 'Once you clearly have both businessType and niche, set done to true, fill in collected with both fields, and set reply to a short (max 2 sentences) friendly confirmation telling them their store is being set up.',
    'Until then, set done to false and leave collected fields null for whatever you do not have yet.',
    'Keep every reply under 3 sentences. Return ONLY valid JSON with no markdown and no extra prose.',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Messages API requires the first turn to be 'user' — inject a synthetic
 * kickoff so a caller can start the conversation with an empty array.
 */
export function withOnboardingChatKickoff(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.length > 0 ? messages : [{ role: 'user', content: '(Start the onboarding conversation.)' }];
}

// --- Business context save (PATCH /api/tenant/business-context, OC.2b) ---

import type { Prisma } from '@prisma/client';

export interface BusinessContextInput {
  businessType?: string;
  niche?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Merge businessType/niche into a tenant's existing `data` JSON blob without
 * clobbering other keys (homepage_generic_images, onboarding_setup, etc.).
 * Pure function — callers own the actual prisma.tenants.update() call so web
 * and mobile can each pick their own select shape. Returned pre-cast to
 * Prisma.InputJsonValue (the same cast every other tenants.data writer in
 * this codebase uses) so callers can pass it straight to `data:` untouched.
 */
export function mergeBusinessContext(
  existingData: unknown,
  input: BusinessContextInput
): Prisma.InputJsonValue {
  const existing = isRecord(existingData) ? existingData : {};
  return {
    ...existing,
    ...(input.businessType ? { business_type: input.businessType } : {}),
    ...(input.niche ? { niche: input.niche } : {}),
  } as Prisma.InputJsonValue;
}
