/**
 * Conversational Product Intake — shared core (AI Phase 1.1,
 * docs/AI_FEATURES_PLAN.md), used by BOTH the web route
 * (src/app/api/products/ai-intake/route.ts) and the mobile route
 * (src/app/api/v1/mobile/products/ai-intake/route.ts), extracted when the
 * mobile route was added so both platforms run the exact same tested
 * prompt/schema — same reasoning as @/lib/assistant/shared.
 *
 * Collects name/price/stock/category/SKU conversationally; does NOT create
 * the product itself (Pattern A — the caller takes `collected` once
 * done:true and calls the existing product-creation endpoint: POST
 * /api/products on web, POST /api/v1/mobile/dashboard/products on mobile —
 * both already validate against the same createProductSchema, so nothing
 * about the actual creation is duplicated or forked here either).
 */

import { prisma } from '@/lib/prisma/client';
import { generateJsonFromConversation, type AiUsage } from '@/lib/ai/claude-client';

export type ProductIntakeMessage = { role: 'user' | 'assistant'; content: string };

export const productIntakeResponseSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    done: { type: 'boolean' },
    collected: {
      type: 'object',
      properties: {
        name: { type: ['string', 'null'] },
        price: { type: ['number', 'null'] },
        stockQuantity: { type: ['number', 'null'] },
        // A name matching one of the tenant's real categories given in the
        // system prompt, or null — never an invented category that doesn't
        // exist for this tenant. See buildProductIntakeSystemPrompt().
        category: { type: ['string', 'null'] },
        sku: { type: ['string', 'null'] },
      },
      required: ['name', 'price', 'stockQuantity', 'category', 'sku'],
      additionalProperties: false,
    },
  },
  required: ['reply', 'done', 'collected'],
  additionalProperties: false,
} as const;

export interface ProductIntakeTurnResponse {
  reply: string;
  done: boolean;
  collected: {
    name: string | null;
    price: number | null;
    stockQuantity: number | null;
    category: string | null;
    sku: string | null;
  };
}

export function buildProductIntakeSystemPrompt(existingCategoryNames: string[]): string {
  // The caller (requireCategoryBeforeProductIntake, @/lib/assistant/shared)
  // guarantees the tenant has at least one real category before this
  // conversation ever starts — a merchant with zero categories is
  // redirected to create one first, never reaches here. existingCategoryNames
  // should therefore never genuinely be empty; the fallback line below is
  // defensive only (e.g. every category getting deleted mid-conversation).
  const categoryList =
    existingCategoryNames.length > 0
      ? `The merchant's existing categories are: ${existingCategoryNames.join(', ')}. Category is REQUIRED — if the product clearly fits one of these, use that exact name for "category". If none fit well, ask the merchant which of their existing categories it belongs to, or whether to use the closest one — never invent a category name that isn't in this list, and never leave category null.`
      : 'This merchant unexpectedly has no categories set up yet — set category to null and mention in your reply that they should add a category from the Categories page.';

  return [
    'You are a product-intake assistant for DukaNest, a Kenyan multi-tenant ecommerce platform.',
    'This conversation creates exactly ONE product listing — never more, even if the merchant mentions a number. If they say something like "add 5 new electric shavers", that is ONE listing (one name, one price) with stockQuantity 5 — the number is how many units they have in stock, not a request for 5 separate listings. Do not ask whether they meant several different products; assume one listing with that stock count unless they explicitly describe several different items.',
    'If the merchant already stated multiple facts at once, extract everything unambiguous immediately — do not re-ask for something they already told you. But a bare product TYPE or category (e.g. "electric shavers", "shoes") is a quantity/category hint, not a specific product name — never invent a specific name like "Electric Shaver" from it. Always ask what they want the exact listing name to be.',
    'Ask for name, price, and category first — these are ALL required (user-requested change: every product must belong to a category). Ask one short, friendly question at a time for whatever is still missing, in that order.',
    categoryList,
    'Once you have name, price, and category, ask once whether they want to specify stock quantity or SKU now, or skip and set them later. Do not insist — one offer is enough.',
    'SKU is optional — if they do not have one, leave it null; the system generates one automatically.',
    'Once you have name, price, and category (and have given them the one chance to add stock/SKU), set done to true, fill in collected with whatever you have (nulls only for stock/SKU if skipped), and reply with a short (max 2 sentences) confirmation. NEVER set done to true while category is still null, unless the merchant genuinely has no categories at all (see above).',
    'Until then, set done to false and leave collected fields null for whatever you do not have yet.',
    'Keep every reply under 3 sentences. Return ONLY valid JSON with no markdown and no extra prose.',
  ].join(' ');
}

/** Runs one turn of the conversation — fetches the tenant's real categories, calls Claude, returns the parsed turn + usage. */
export async function runProductIntakeTurn(
  tenantId: string,
  messages: ProductIntakeMessage[],
): Promise<{ data: ProductIntakeTurnResponse; usage: AiUsage }> {
  const categories = await prisma.categories.findMany({
    where: { tenant_id: tenantId, status: 'active' },
    select: { name: true },
    take: 100,
  });
  const categoryNames = categories.map((c) => c.name);

  const effectiveMessages =
    messages.length > 0 ? messages : [{ role: 'user' as const, content: '(Start the product intake conversation.)' }];

  return generateJsonFromConversation<ProductIntakeTurnResponse>({
    system: buildProductIntakeSystemPrompt(categoryNames),
    messages: effectiveMessages,
    schema: productIntakeResponseSchema,
    maxTokens: 500,
  });
}
