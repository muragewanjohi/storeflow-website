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
import { isServiceOnlyBusinessType } from '@/lib/categories/business-type-taxonomy';

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
        // Basic services support (docs/SERVICES_PLAN.md) — true (ships),
        // false (a service/digital item — stockQuantity is skipped
        // entirely when this is false), or null while not yet asked.
        requiresShipping: { type: ['boolean', 'null'] },
        // Basic deposit support (docs/SERVICES_PLAN.md, S-Dep.9) — unlike
        // requiresShipping this is genuinely OPTIONAL: 'none' (the common
        // case, no deposit) is a real answer, not a "not yet asked"
        // placeholder. null means not yet asked; the model is instructed to
        // never leave it null once done:true (defaults to 'none' if the
        // merchant declines or doesn't respond after one offer). Re-checked
        // against the real 'none'|'fixed'|'percentage' enum in code before
        // ever reaching product creation — never trusted raw from the model.
        depositType: { type: ['string', 'null'] },
        // Only meaningful when depositType is 'fixed' (a KES amount) or
        // 'percentage' (0-100); null whenever depositType is 'none' or null.
        depositValue: { type: ['number', 'null'] },
      },
      required: [
        'name',
        'price',
        'stockQuantity',
        'category',
        'sku',
        'requiresShipping',
        'depositType',
        'depositValue',
      ],
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
    requiresShipping: boolean | null;
    depositType: string | null;
    depositValue: number | null;
  };
}

/**
 * Re-validates depositType/depositValue exactly like every other
 * model-produced value in this codebase (e.g. B2.1's color/font
 * re-checking) — never trusted raw. Falls back to 'none'/null for
 * anything off the real `deposit_type` enum (@/lib/products/validation.ts)
 * or a non-positive/out-of-range value, so a malformed model output can
 * never reach real product creation as a bogus deposit.
 */
export function sanitizeCollectedDeposit(
  depositType: string | null,
  depositValue: number | null,
): { depositType: 'none' | 'fixed' | 'percentage'; depositValue: number | null } {
  if (depositType === 'fixed' && typeof depositValue === 'number' && depositValue > 0) {
    return { depositType: 'fixed', depositValue };
  }
  if (
    depositType === 'percentage' &&
    typeof depositValue === 'number' &&
    depositValue > 0 &&
    depositValue <= 100
  ) {
    return { depositType: 'percentage', depositValue };
  }
  return { depositType: 'none', depositValue: null };
}

export function buildProductIntakeSystemPrompt(
  existingCategoryNames: string[],
  businessType?: string | null,
): string {
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

  // User-requested connection: "when the store is registered do we track
  // what is a service based on what the user selects as a business type /
  // category?" — for the 10 explicit service-only business types
  // (@/lib/categories/business-type-taxonomy.ts), confirm rather than ask
  // cold. Still a real confirmation, not a silent default — the merchant
  // can always correct it (a service business can still sell a physical
  // add-on item).
  const shippingQuestionInstruction = isServiceOnlyBusinessType(businessType)
    ? `Once you have name, price, and category, confirm shipping instead of asking cold: this merchant's registered business type is "${businessType}", a service business, so lead with an assumption they can correct, e.g. "I'll assume this doesn't need shipping since you're a ${businessType} business — sound right, or is this a physical item?" Set requiresShipping to false if they confirm/say nothing contradicts it, or true if they correct you. Still REQUIRED — never leave it null without asking this once.`
    : 'Once you have name, price, and category, ask ONE more required question: does this need to be shipped, or is it a service, booking, or digital item that does not ship (e.g. a haircut, a consultation, a downloadable file)? Set requiresShipping to true or false based on their answer — never guess or default it, always ask.';

  return [
    'You are a product-intake assistant for DukaNest, a Kenyan multi-tenant ecommerce platform.',
    'This conversation creates exactly ONE product listing — never more, even if the merchant mentions a number. If they say something like "add 5 new electric shavers", that is ONE listing (one name, one price) with stockQuantity 5 — the number is how many units they have in stock, not a request for 5 separate listings. Do not ask whether they meant several different products; assume one listing with that stock count unless they explicitly describe several different items.',
    'If the merchant already stated multiple facts at once, extract everything unambiguous immediately — do not re-ask for something they already told you. But a bare product TYPE or category (e.g. "electric shavers", "shoes") is a quantity/category hint, not a specific product name — never invent a specific name like "Electric Shaver" from it. Always ask what they want the exact listing name to be.',
    'Ask for name, price, and category first — these are ALL required (user-requested change: every product must belong to a category). Ask one short, friendly question at a time for whatever is still missing, in that order.',
    categoryList,
    // Basic services support (docs/SERVICES_PLAN.md) — a service/digital
    // item never has stock tracked, so this question decides whether to
    // ask about stock at all, not just another optional field.
    shippingQuestionInstruction,
    'If requiresShipping is true, ask once whether they want to specify stock quantity or SKU now, or skip and set them later. Do not insist — one offer is enough, and stockQuantity stays null if skipped.',
    'If requiresShipping is false, do NOT ask about stock quantity at all — it does not apply. You may still ask once whether they want to add a SKU, or skip.',
    'SKU is optional either way — if they do not have one, leave it null; the system generates one automatically.',
    // Basic deposit support (docs/SERVICES_PLAN.md, S-Dep.9) — genuinely
    // optional, unlike requiresShipping: ask once, do not insist, and
    // default to no deposit rather than blocking completion.
    'After the stock/SKU offer, ask ONE more optional question: does this need a deposit or partial payment upfront before it ships/is delivered/performed? If yes, ask whether it is a fixed KES amount or a percentage of the price, and how much. Set depositType to "fixed" or "percentage" with depositValue set to that number (a percentage must be between 1 and 100). If they say no, or do not want one, or do not answer, set depositType to "none" and depositValue to null — do not ask again or insist.',
    'Once you have name, price, category, requiresShipping, and depositType (and have given them the one chance to add stock/SKU when it applies, and the one chance to add a deposit), set done to true, fill in collected with whatever you have (nulls only for stock/SKU/depositValue if skipped or not applicable), and reply with a short (max 2 sentences) confirmation. NEVER set done to true while category or requiresShipping is still null, unless the merchant genuinely has no categories at all (see above); depositType, unlike those two, may become "none" instead of staying null — but never leave it as a literal null once done is true.',
    'Until then, set done to false and leave collected fields null for whatever you do not have yet.',
    'Keep every reply under 3 sentences. Return ONLY valid JSON with no markdown and no extra prose.',
  ].join(' ');
}

/** Runs one turn of the conversation — fetches the tenant's real categories and recorded business type, calls Claude, returns the parsed turn + usage. */
export async function runProductIntakeTurn(
  tenantId: string,
  messages: ProductIntakeMessage[],
): Promise<{ data: ProductIntakeTurnResponse; usage: AiUsage }> {
  const [categories, tenant] = await Promise.all([
    prisma.categories.findMany({
      where: { tenant_id: tenantId, status: 'active' },
      select: { name: true },
      take: 100,
    }),
    prisma.tenants.findUnique({ where: { id: tenantId }, select: { data: true } }),
  ]);
  const categoryNames = categories.map((c) => c.name);
  const businessType =
    typeof (tenant?.data as Record<string, unknown> | null)?.business_type === 'string'
      ? ((tenant!.data as Record<string, unknown>).business_type as string)
      : null;

  const effectiveMessages =
    messages.length > 0 ? messages : [{ role: 'user' as const, content: '(Start the product intake conversation.)' }];

  return generateJsonFromConversation<ProductIntakeTurnResponse>({
    system: buildProductIntakeSystemPrompt(categoryNames, businessType),
    messages: effectiveMessages,
    schema: productIntakeResponseSchema,
    maxTokens: 500,
  });
}
