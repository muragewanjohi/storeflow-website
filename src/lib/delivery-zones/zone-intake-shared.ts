/**
 * Conversational Delivery-Zone Intake — shared core (AI Phase 7.1,
 * docs/AI_FEATURES_PLAN.md), used by BOTH the web route
 * (src/app/api/delivery-zones/ai-intake/route.ts) and the mobile route
 * (src/app/api/v1/mobile/delivery-zones/ai-intake/route.ts) — same
 * "one tested implementation, not two copies" pattern as
 * @/lib/products/ai-intake-shared, which this module mirrors structurally.
 *
 * Collects name/fee/coverage-locations conversationally; does NOT create
 * the zone itself (Pattern A — the caller takes `collected` once done:true
 * and calls the existing zone-creation endpoint: POST /api/admin/delivery-zones
 * on web, POST /api/v1/mobile/dashboard/delivery-zones on mobile — both
 * already validate against the same real schema, so nothing about the
 * actual creation is duplicated or forked here).
 *
 * Real grounding discipline (AI_FEATURES_PLAN.md Phase 7): "AI
 * conversationally prompts for real zone/fee data — it does not invent
 * coverage areas or courier rates." Every field here comes from what the
 * merchant actually says; nothing is ever guessed or defaulted by Claude.
 */

import { prisma } from '@/lib/prisma/client';
import { generateJsonFromConversation, type AiUsage } from '@/lib/ai/claude-client';

export type ZoneIntakeMessage = { role: 'user' | 'assistant'; content: string };

export const zoneIntakeResponseSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    done: { type: 'boolean' },
    collected: {
      type: 'object',
      properties: {
        name: { type: ['string', 'null'] },
        price: { type: ['number', 'null'] },
        // Real place names the merchant actually said (e.g. "Westlands",
        // "Parklands") — never invented, never a generic placeholder.
        locations: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'price', 'locations'],
      additionalProperties: false,
    },
  },
  required: ['reply', 'done', 'collected'],
  additionalProperties: false,
} as const;

export interface ZoneIntakeTurnResponse {
  reply: string;
  done: boolean;
  collected: {
    name: string | null;
    price: number | null;
    locations: string[];
  };
}

export function buildZoneIntakeSystemPrompt(existingZoneNames: string[]): string {
  const existingList =
    existingZoneNames.length > 0
      ? `Their existing delivery zones are: ${existingZoneNames.join(', ')}. If they name a new zone with the exact same name as one of these, gently point that out in your reply and ask for a different name (still leave "name" null in collected until they give a distinct one) — do not silently let a duplicate through.`
      : 'They have no delivery zones set up yet.';

  return [
    'You are a delivery-zone-setup assistant for DukaNest, a Kenyan multi-tenant ecommerce platform.',
    'This conversation creates exactly ONE delivery zone: a name, a flat delivery fee (in KES), and the real real-world areas/neighborhoods it covers.',
    'Never invent or suggest coverage areas, neighborhood names, or a fee amount — every one of these must come directly from what the merchant actually says. If you are unsure what they mean by an area name, ask them to clarify rather than guessing a nearby-sounding real place.',
    'Ask for the zone name first (e.g. "Nairobi CBD", "Westlands & Parklands", "Countrywide"), then which real areas/neighborhoods it covers (one or more — they can list several), then the flat delivery fee in KES for that zone.',
    'If the merchant already stated multiple facts at once, extract everything unambiguous immediately — do not re-ask for something they already told you.',
    existingList,
    'Once you have a real name, at least one real location, and a real price, set done to true, fill in collected with exactly what they said, and reply with a short (max 2 sentences) confirmation.',
    'Until then, set done to false and leave collected fields null/empty for whatever you do not have yet.',
    'Keep every reply under 3 sentences. Return ONLY valid JSON with no markdown and no extra prose.',
  ].join(' ');
}

/** Runs one turn of the conversation — fetches the tenant's real existing zone names (to avoid a silent duplicate), calls Claude, returns the parsed turn + usage. */
export async function runZoneIntakeTurn(
  tenantId: string,
  messages: ZoneIntakeMessage[],
): Promise<{ data: ZoneIntakeTurnResponse; usage: AiUsage }> {
  const zones = await prisma.delivery_zones.findMany({
    where: { tenant_id: tenantId },
    select: { name: true },
    take: 100,
  });
  const existingZoneNames = zones.map((z) => z.name);

  const effectiveMessages =
    messages.length > 0 ? messages : [{ role: 'user' as const, content: '(Start the delivery zone setup conversation.)' }];

  return generateJsonFromConversation<ZoneIntakeTurnResponse>({
    system: buildZoneIntakeSystemPrompt(existingZoneNames),
    messages: effectiveMessages,
    schema: zoneIntakeResponseSchema,
    maxTokens: 500,
  });
}
