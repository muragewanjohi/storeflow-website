/**
 * Dashboard AI Assistant — shared intent-classification + handler logic,
 * used by BOTH the web route (src/app/api/assistant/chat/route.ts) and the
 * mobile route (src/app/api/v1/mobile/assistant/chat/route.ts).
 *
 * Extracted here (rather than each route reimplementing it, or one importing
 * from the other's route.ts file) when the mobile route was added, so both
 * platforms run the EXACT same tested prompts/queries — the only things that
 * differ between them are auth (cookie session vs. bearer token) and
 * response envelope shape, handled entirely in each route file.
 *
 * `configuration_guidance` (DA.3) classification (which target the merchant
 * means) IS shared — buildConfigTargetSystemPrompt()/configTargetSchema
 * below — but each platform answers a resolved target differently: web
 * hands off to POST /api/products/ai-intake for the frontend to drive a
 * chat flow directly; mobile has no such chat UI (Flutter already has a
 * native product form), so its route returns a direct navigational pointer
 * instead (a next_steps-shaped deep link into that native screen) — see
 * each route's own handleConfigurationGuidance()/equivalent.
 *
 * Real-world fix (found via live user testing on both platforms): "How do I
 * add a product?" used to route to help_question and decline (no help
 * article literally contains the word "add" — confirmed via direct SQL,
 * see DA.2/DA.3's tracker notes), a dead end even though the assistant CAN
 * actually help. buildClassifySystemPrompt() now prefers
 * configuration_guidance specifically for add-a-product questions
 * regardless of "how do I" vs. "help me" phrasing, since there's no doc
 * coverage to fall back on and a working guided answer beats a decline.
 *
 * data_query (DA.1): Claude proposes a filter against a small allow-list
 * (metric/category/dateRangeType) — it never computes the number. The
 * caller resolves dateRangeType to exact dates server-side, resolves
 * category name -> id against the tenant's real categories, and runs a real
 * Prisma aggregate with tenant_id from the session.
 *
 * help_question (DA.2): retrieval-grounded, not open-book. Runs full-text
 * search against the real `user_guide_articles` content (the same docs
 * behind dukanest.com/help) using the plainto_tsquery pattern from
 * products/route.ts, and feeds Claude ONLY the matched excerpts. Claude must
 * answer strictly from those excerpts and cite which article(s) it used.
 *
 * next_steps: "what should I do next?" — reuses the exact same
 * buildGettingStartedProgress() the dashboard home page's checklist widget
 * already computes from, so the assistant's answer can never disagree with
 * what's shown elsewhere in the app. Purely templated — no generation call.
 */

import type { Tenant } from '@/lib/tenant-context';
import { prisma } from '@/lib/prisma/client';
import { generateJsonFromConversation, type AiUsage } from '@/lib/ai/claude-client';
import { countActiveDemoProducts } from '@/lib/products/demo-products';
import { getStaticOptions } from '@/lib/settings/static-options';
import { buildGettingStartedProgress, GETTING_STARTED_OPTION_NAMES } from '@/lib/onboarding/getting-started-progress';
import { generateSlug } from '@/lib/products/validation';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

// ---------------------------------------------------------------------------
// Intent classification
// ---------------------------------------------------------------------------

export const SUPPORTED_INTENTS = ['data_query', 'help_question', 'configuration_guidance', 'next_steps', 'business_advice', 'unclear'] as const;
export type Intent = (typeof SUPPORTED_INTENTS)[number];

export function isIntent(value: string): value is Intent {
  return (SUPPORTED_INTENTS as readonly string[]).includes(value);
}

export const classifySchema = {
  type: 'object',
  properties: {
    intent: { type: 'string' },
  },
  required: ['intent'],
  additionalProperties: false,
} as const;

/**
 * @param includeConfigurationGuidance Both platforms offer it today — web
 * hands off to a chat flow, mobile returns a direct navigational pointer
 * (see module docblock). Kept as an explicit flag (not always-true) in case
 * a future platform genuinely has no way to help with any configuration
 * target yet — omitting it from the prompt then would keep Claude from
 * ever routing somewhere that platform can't actually act on, consistent
 * with this whole assistant's "never offer what you can't actually do"
 * discipline.
 */
export function buildClassifySystemPrompt(includeConfigurationGuidance: boolean): string {
  return [
    'You are the intent router for the DukaNest Dashboard AI Assistant, embedded in a merchant\'s store dashboard. The full conversation so far is provided for context — use it. If the latest message is a short follow-up (e.g. "what about products?", "and this month?", "same for categories") that only makes sense given what was just discussed, resolve it using that context rather than treating it as unclear on its own.',
    'Classify the merchant\'s latest message (in context of the conversation) into exactly one intent:',
    '"data_query" — asking about their OWN store\'s numbers: sales, revenue, orders, expenses, product/category counts (e.g. "how many shoes did I sell this month", "what was my revenue last week", "how many products do I have").',
    '"help_question" — asking to UNDERSTAND how something works or what a feature does — an informational, read-about-it question (e.g. "how do I create a discount code", "what is the page builder", "where do I set my delivery zones").',
    includeConfigurationGuidance
      ? '"configuration_guidance" — asking the assistant to ACTIVELY walk them through doing/setting up ONE SPECIFIC thing right now, not just explain it (e.g. "help me add a product", "walk me through adding a new product", "how do I add a category", "set up a product for me").'
      : undefined,
    '"next_steps" — asking what to do next, how to get started, what is left to finish setting up their store, or for a general setup/progress overview — not about one specific feature, but the big picture (e.g. "what should I do next", "what should I do", "how do I get started", "what\'s left to set up", "am I ready to launch", "help me get my store ready").',
    '"business_advice" — asking for retail/business advice or opinion about THEIR BUSINESS, independent of DukaNest as a platform: what categories or product types fit their business, what attributes matter for a kind of product, general pricing strategy, how much to charge for a specific product, OR asking what their OWN recorded business type/niche IS (e.g. "what categories should I have", "how much should I charge for my leather bag", "what\'s my business type", "what niche did I register as", "remind me what kind of business I set up"). This is different from help_question — help_question is about how to USE DukaNest\'s features; business_advice covers both retail expertise and their own recorded business profile, neither of which any DukaNest document would contain.',
    `"unclear" — anything else: small talk, requests outside all ${includeConfigurationGuidance ? 'five' : 'four'} categories, or genuinely ambiguous even with conversation context.`,
    includeConfigurationGuidance
      ? 'Exception: ANY question about adding/creating a product OR a category — including "how do I add a product", "how do I add a category", "how do I create a product listing" — is ALWAYS configuration_guidance, never help_question. There is no help-center article that covers either topic, so treating it as help_question always leads to a dead end; the assistant can actually walk the merchant through it, so offer that instead.'
      : undefined,
    includeConfigurationGuidance
      ? 'For anything else, if in doubt between help_question and configuration_guidance, prefer help_question — only use configuration_guidance when the merchant clearly wants the assistant to do the setup with them right now, not just explain the steps.'
      : undefined,
    includeConfigurationGuidance
      ? 'If in doubt between configuration_guidance and next_steps, prefer next_steps — configuration_guidance is only for when the merchant already named ONE specific thing to set up (like "a product" or "a category"); a vague "what should I do" or "what should I do next" is always next_steps.'
      : undefined,
    includeConfigurationGuidance
      ? 'If your own previous message in this conversation proposed specific category names (or asked to confirm creating something) and the merchant\'s latest message is a short affirmative reply agreeing to it (e.g. "yes", "sure", "go ahead", "create those", "sounds good") — that is still configuration_guidance, continuing the same request, not unclear.'
      : undefined,
    'If in doubt between help_question/configuration_guidance and business_advice, ask: is this about DukaNest\'s UI (where a button is, how to save a setting) or retail judgment no DukaNest document would ever contain (what to sell, what to name things, what to charge)? "How do I add a category" is about the UI, not business_advice; "what categories should I add" is retail judgment, business_advice.',
    'Return ONLY valid JSON with no markdown and no extra prose.',
  ]
    .filter(Boolean)
    .join(' ');
}

export function unclearReply(includeProductIntake: boolean): string {
  // "help you add a new product" (not "walk you through...") so this reads
  // accurately on both platforms — web's is a multi-turn chat, mobile's is
  // a one-shot pointer to the native form.
  return `I can answer questions about your store's data (like units sold, revenue, order count, or expenses for a time period), help you understand how to use DukaNest's features${includeProductIntake ? ', help you add a new product,' : ''}, suggest categories/products/pricing for your business, or tell you what to set up next. Could you rephrase your question that way?`;
}

export interface HandlerResult {
  intent: Intent;
  answer: string;
  data?: unknown;
  usage: AiUsage;
}

// ---------------------------------------------------------------------------
// configuration_guidance target classification (DA.3) — shared; what each
// platform DOES with a resolved target is platform-specific, defined in
// each route file (web hands off to a chat flow, mobile returns a direct
// navigational pointer).
// ---------------------------------------------------------------------------

// Grows as more targets ship (Phase 7.1 delivery zones, etc.) — each new
// one is one more entry here, not a new architecture. Not every target
// needs a conversational intake (only product_intake does, on web) — some,
// like 'category', are simple enough that this module can just create them
// directly and immediately when the merchant already named them, on BOTH
// platforms — see handleCategoryConfigTarget() below.
export const CONFIG_TARGETS = ['product_intake', 'category', 'unsupported'] as const;
export type ConfigTarget = (typeof CONFIG_TARGETS)[number];

export const configTargetSchema = {
  type: 'object',
  properties: {
    target: { type: 'string' },
    // Populated when target === 'category' and either (a) the merchant
    // already named the category/categories explicitly in their message
    // (e.g. "create the categories Care Gadgets and Smart Home"), OR (b)
    // the assistant's own previous message proposed specific names (see
    // suggestedCategoryNames below) and the merchant's latest message
    // agrees to them — in that case, extract those SAME previously
    // suggested names here now, turning the suggestion into real creation.
    // Left empty for a bare "how do I add a category" — never invent a name
    // that wasn't either given by the merchant or previously suggested and
    // now confirmed.
    categoryNames: { type: 'array', items: { type: 'string' } },
    // Populated ONLY when target === 'category', categoryNames is empty,
    // and this is a first-time un-named request (not a confirmation) — a
    // real, business-context-grounded suggestion (2-5 names) the merchant
    // can confirm on their NEXT message to have them actually created. See
    // buildConfigTargetSystemPrompt()'s business-context grounding.
    suggestedCategoryNames: { type: 'array', items: { type: 'string' } },
  },
  required: ['target', 'categoryNames', 'suggestedCategoryNames'],
  additionalProperties: false,
} as const;

export interface ConfigTargetParseResult {
  target: string;
  categoryNames: string[];
  suggestedCategoryNames: string[];
}

/**
 * @param businessType/@param niche Real tenant profile (tenants.data,
 * same source as handleBusinessAdvice/getBusinessProfile) — grounds
 * suggestedCategoryNames in this merchant's actual business instead of
 * generic retail categories, same discipline as business_advice.
 * @param existingCategoryNames Real current categories, so a suggestion
 * never duplicates one they already have.
 */
export function buildConfigTargetSystemPrompt(
  businessType: string | null,
  niche: string | null,
  existingCategoryNames: string[],
): string {
  const businessContext = businessType
    ? `Their recorded business type is "${businessType}"${niche ? ` and their niche is "${niche}"` : ''}.`
    : 'Their business type has not been recorded yet — if you need to suggest categories, keep suggestions generic retail categories.';
  const existingList =
    existingCategoryNames.length > 0
      ? `Their existing categories are: ${existingCategoryNames.join(', ')}. Never suggest one of these again.`
      : 'They have no categories yet.';

  return [
    'The merchant wants active, step-by-step help setting something up in DukaNest — not just an explanation.',
    'Currently supported guided setups: "product_intake" — adding a new product (name, price, stock, category, SKU). "category" — adding a new category (name, optional parent category).',
    'If their request is about adding or creating a product, return target: "product_intake". If it is about adding or creating a category, return target: "category".',
    'If target is "category", there are three cases:',
    '1. They already named the category/categories in THIS message (e.g. "create the categories Care Gadgets and Smart Home", "add a Electronics category") — extract each name EXACTLY as given into categoryNames. suggestedCategoryNames stays empty.',
    '2. They did not name any categories in this message, but YOUR OWN previous message in this conversation already proposed a specific list of category names AND their latest message clearly agrees to it (e.g. "yes", "sure, create those", "sounds good", "go ahead", "do it") — extract those SAME exact names you previously proposed into categoryNames now. suggestedCategoryNames stays empty. This is how an earlier suggestion becomes a real creation request.',
    `3. Otherwise — a first-time request with no names given (e.g. "help me create two categories for my store", "how do I add a category") — leave categoryNames empty, and instead propose 2-5 realistic, specific category names into suggestedCategoryNames, grounded in their real business context below. ${businessContext} ${existingList} Never invent categories unrelated to their actual business.`,
    'For anything else (delivery zones, themes, payment settings, staff accounts, legal pages, or anything not about adding a product or category), return target: "unsupported" — guided setup for those is not available yet. categoryNames and suggestedCategoryNames are always empty unless target is "category".',
    'Return ONLY valid JSON with no markdown and no extra prose.',
  ].join(' ');
}

/** Resolves the classify step's raw target string against the real allow-list — never trust it verbatim. */
export function resolveConfigTarget(rawTarget: string): ConfigTarget {
  return (CONFIG_TARGETS as readonly string[]).includes(rawTarget) ? (rawTarget as ConfigTarget) : 'unsupported';
}

/**
 * Real recorded business_type/niche (tenants.data, written at registration
 * and optionally enriched via the onboarding chat) — the same real-context
 * source handleBusinessAdvice grounds itself in, reused here so category
 * suggestions (handleCategoryConfigTarget) are grounded in the same real
 * facts rather than a second, drifting extraction of the same fields.
 */
export function getBusinessProfile(tenant: Tenant): { businessType: string | null; niche: string | null } {
  const businessType = typeof tenant.data?.business_type === 'string' ? tenant.data.business_type : null;
  const niche = typeof tenant.data?.niche === 'string' ? tenant.data.niche : null;
  return { businessType, niche };
}

/**
 * Real category creation, mirroring POST /api/categories's own logic
 * exactly (same generateSlug() helper, same slug-collision check) so this
 * doesn't become a second, drifting implementation of "how DukaNest creates
 * a category" — it just runs that same logic directly against Prisma
 * instead of over HTTP, same reasoning as every other direct-Prisma call in
 * this module. Skips (does not error on) names that collide with an
 * existing category's slug, so a merchant can safely re-ask without
 * duplicating anything.
 */
async function createCategoriesFromNames(tenantId: string, rawNames: string[]): Promise<{ created: string[]; skippedExisting: string[] }> {
  const created: string[] = [];
  const skippedExisting: string[] = [];

  for (const rawName of rawNames) {
    const name = rawName.trim();
    if (!name) continue;
    const slug = generateSlug(name);

    const existing = await prisma.categories.findFirst({ where: { tenant_id: tenantId, slug } });
    if (existing) {
      skippedExisting.push(name);
      continue;
    }

    await prisma.categories.create({
      data: { tenant_id: tenantId, name, slug, status: 'active' },
    });
    created.push(name);
  }

  return { created, skippedExisting };
}

/**
 * Answers a resolved 'category' configuration_guidance target — shared
 * verbatim by both platforms (unlike 'product_intake', there's no chat-vs-
 * pointer platform difference here: category creation needs only a name,
 * so both platforms can just do it).
 *
 * Three cases (matching buildConfigTargetSystemPrompt()'s three cases):
 *  1. The merchant already named categories (this turn, or confirming a
 *     suggestion made last turn — buildConfigTargetSystemPrompt()'s job to
 *     tell the two apart using conversation history) — creates them for
 *     real and confirms with the actual result.
 *  2. No names given, but Claude proposed real business-context-grounded
 *     suggestions — offers them AND a manual-link fallback, asking the
 *     merchant to confirm before anything is created. Nothing is created
 *     yet; a later "yes" turn re-enters this function via case 1.
 *  3. No names, no suggestions possible (e.g. business type unknown) —
 *     falls back to the original navigational pointer.
 */
export async function handleCategoryConfigTarget(
  tenant: Tenant,
  categoryNames: string[],
  suggestedCategoryNames: string[],
  pointer: { href: string; cta: string },
): Promise<HandlerResult> {
  const zeroUsage: AiUsage = { inputTokens: 0, outputTokens: 0 };
  const pointerStep = { id: 'category', label: 'Add a category', description: 'Opens the category form', href: pointer.href, cta: pointer.cta };

  if (categoryNames.length === 0) {
    if (suggestedCategoryNames.length > 0) {
      return {
        intent: 'configuration_guidance',
        answer: `Based on your store, you could use: ${suggestedCategoryNames.join(', ')}. Want me to create these for you? Just say the word — or add your own from the Categories page.`,
        data: { target: 'category', suggested: suggestedCategoryNames, steps: [pointerStep] },
        usage: zeroUsage,
      };
    }
    return {
      intent: 'configuration_guidance',
      answer: 'You can add a new category from the Categories page.',
      data: { target: 'category', steps: [pointerStep] },
      usage: zeroUsage,
    };
  }

  const { created, skippedExisting } = await createCategoriesFromNames(tenant.id, categoryNames);

  const parts: string[] = [];
  if (created.length > 0) {
    parts.push(`Created ${created.length === 1 ? 'category' : 'categories'}: ${created.join(', ')}.`);
  }
  if (skippedExisting.length > 0) {
    parts.push(`${skippedExisting.join(', ')} already existed, so ${skippedExisting.length === 1 ? 'it was' : 'they were'} left as-is.`);
  }
  if (parts.length === 0) {
    parts.push("I couldn't create those categories — please try adding them from the Categories page.");
  }

  return {
    intent: 'configuration_guidance',
    answer: parts.join(' '),
    data: { target: 'category', created, skippedExisting },
    usage: zeroUsage,
  };
}

// ---------------------------------------------------------------------------
// data_query handler (DA.1)
// ---------------------------------------------------------------------------

const SUPPORTED_METRICS = ['units_sold', 'revenue', 'orders_count', 'expenses_total', 'product_count', 'category_count'] as const;
type Metric = (typeof SUPPORTED_METRICS)[number];

const SUPPORTED_DATE_RANGES = ['today', 'this_week', 'this_month', 'last_month', 'this_year', 'all_time'] as const;
type DateRangeType = (typeof SUPPORTED_DATE_RANGES)[number];

const dataQueryParseSchema = {
  type: 'object',
  properties: {
    understood: { type: 'boolean' },
    metric: { type: ['string', 'null'] },
    category: { type: ['string', 'null'] },
    dateRangeType: { type: ['string', 'null'] },
  },
  required: ['understood', 'metric', 'category', 'dateRangeType'],
  additionalProperties: false,
} as const;

interface DataQueryParseResult {
  understood: boolean;
  metric: string | null;
  category: string | null;
  dateRangeType: string | null;
}

function buildDataQuerySystemPrompt(categoryNames: string[]): string {
  return [
    'You are the data-query parser for the DukaNest Dashboard AI Assistant.',
    'Your only job is to extract structured parameters from the merchant\'s question — you never compute or state the answer yourself.',
    `Supported metrics: ${SUPPORTED_METRICS.join(', ')} (units_sold = count of items sold, revenue = money collected from paid orders, orders_count = number of orders placed, expenses_total = money spent on business expenses, product_count = how many products the merchant currently has, category_count = how many categories the merchant currently has).`,
    `Supported date ranges: ${SUPPORTED_DATE_RANGES.join(', ')}.`,
    'product_count and category_count are current counts, not time-ranged activity — always set dateRangeType to "all_time" for these two metrics regardless of how the question is phrased.',
    categoryNames.length > 0
      ? `The merchant's existing categories are: ${categoryNames.join(', ')}. If the question mentions one, use its exact name for "category". Otherwise set category to null.`
      : 'This merchant has no categories set up — always set category to null.',
    'If the question maps cleanly to one supported metric and one supported date range, set understood to true and fill in metric/dateRangeType (and category if relevant, else null).',
    'If the question is ambiguous, asks for something outside this list (e.g. a specific product by name, a comparison, a forecast), or mentions a category that is not in the list above, set understood to false and set metric/category/dateRangeType to null — do not guess.',
    'Return ONLY valid JSON with no markdown and no extra prose.',
  ].join(' ');
}

function isMetric(value: string | null): value is Metric {
  return value !== null && (SUPPORTED_METRICS as readonly string[]).includes(value);
}

function isDateRangeType(value: string | null): value is DateRangeType {
  return value !== null && (SUPPORTED_DATE_RANGES as readonly string[]).includes(value);
}

/** Resolves a date-range enum into exact bounds using the server's real clock — never Claude's arithmetic. */
function resolveDateRange(type: DateRangeType): { start: Date; end: Date; label: string } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (type) {
    case 'today':
      return { start: startOfDay(now), end, label: 'today' };
    case 'this_week': {
      const dayOfWeek = now.getDay(); // 0 = Sunday
      const start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek);
      return { start: startOfDay(start), end, label: 'this week' };
    }
    case 'this_month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end, label: 'this month' };
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end: lastMonthEnd, label: 'last month' };
    }
    case 'this_year':
      return { start: new Date(now.getFullYear(), 0, 1), end, label: 'this year' };
    case 'all_time':
      return { start: new Date(2000, 0, 1), end, label: 'all time' };
  }
}

function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

export async function handleDataQuery(messages: ChatMessage[], tenantId: string): Promise<HandlerResult> {
  const categories = await prisma.categories.findMany({
    where: { tenant_id: tenantId, status: 'active' },
    select: { id: true, name: true },
    take: 200,
  });
  const categoryNames = categories.map((c) => c.name);

  const { data, usage } = await generateJsonFromConversation<DataQueryParseResult>({
    system: buildDataQuerySystemPrompt(categoryNames),
    messages,
    schema: dataQueryParseSchema,
    maxTokens: 300,
  });

  if (!data.understood || !isMetric(data.metric) || !isDateRangeType(data.dateRangeType)) {
    return { intent: 'unclear', answer: unclearReply(false), usage };
  }

  const metric: Metric = data.metric;
  const dateRangeType: DateRangeType = data.dateRangeType;
  const { start, end, label } = resolveDateRange(dateRangeType);

  const matchedCategory = data.category
    ? categories.find((c) => c.name.toLowerCase() === data.category!.toLowerCase())
    : undefined;
  const categoryLabel = matchedCategory ? ` of ${matchedCategory.name}` : '';

  let answer: string;
  let raw: { metric: Metric; value: number; dateRangeType: DateRangeType; category: string | null };

  switch (metric) {
    case 'units_sold': {
      const result = await prisma.order_products.aggregate({
        where: {
          tenant_id: tenantId,
          created_at: { gte: start, lte: end },
          ...(matchedCategory ? { products: { category_id: matchedCategory.id } } : {}),
        },
        _sum: { quantity: true },
      });
      const value = result._sum.quantity ?? 0;
      answer = `You've sold ${value} unit${value === 1 ? '' : 's'}${categoryLabel} ${label}.`;
      raw = { metric, value, dateRangeType, category: matchedCategory?.name ?? null };
      break;
    }
    case 'revenue': {
      const result = await prisma.order_products.aggregate({
        where: {
          tenant_id: tenantId,
          created_at: { gte: start, lte: end },
          orders: { payment_status: 'paid' },
          ...(matchedCategory ? { products: { category_id: matchedCategory.id } } : {}),
        },
        _sum: { total: true },
      });
      const value = Number(result._sum.total ?? 0);
      answer = `Your revenue${categoryLabel} ${label} is ${formatKes(value)}.`;
      raw = { metric, value, dateRangeType, category: matchedCategory?.name ?? null };
      break;
    }
    case 'orders_count': {
      const value = await prisma.orders.count({
        where: { tenant_id: tenantId, created_at: { gte: start, lte: end } },
      });
      answer = `You've had ${value} order${value === 1 ? '' : 's'} ${label}.`;
      raw = { metric, value, dateRangeType, category: null };
      break;
    }
    case 'expenses_total': {
      const result = await prisma.expenses.aggregate({
        where: {
          tenant_id: tenantId,
          expense_date: { gte: start, lte: end },
          ...(data.category ? { category: { equals: data.category, mode: 'insensitive' } } : {}),
        },
        _sum: { amount: true },
      });
      const value = Number(result._sum.amount ?? 0);
      answer = `Your expenses${data.category ? ` for ${data.category}` : ''} ${label} total ${formatKes(value)}.`;
      raw = { metric, value, dateRangeType, category: data.category ?? null };
      break;
    }
    case 'product_count': {
      const value = await prisma.products.count({
        where: {
          tenant_id: tenantId,
          status: 'active',
          ...(matchedCategory ? { category_id: matchedCategory.id } : {}),
        },
      });
      answer = `You have ${value} active product${value === 1 ? '' : 's'}${categoryLabel}.`;
      raw = { metric, value, dateRangeType, category: matchedCategory?.name ?? null };
      break;
    }
    case 'category_count': {
      const value = await prisma.categories.count({
        where: { tenant_id: tenantId, status: 'active' },
      });
      answer = `You have ${value} categor${value === 1 ? 'y' : 'ies'}.`;
      raw = { metric, value, dateRangeType, category: null };
      break;
    }
  }

  return { intent: 'data_query', answer, data: raw, usage };
}

// ---------------------------------------------------------------------------
// help_question handler (DA.2)
// ---------------------------------------------------------------------------

const HELP_CANDIDATE_LIMIT = 3;
// user_guide_articles has no stored search_vector/GIN index (unlike
// products) — the doc set is currently ~48 short articles (avg ~2.2KB), so
// computing to_tsvector on the fly per query is cheap. If the help center
// grows into the hundreds of articles, add a stored search_vector column +
// GIN index the same way products/route.ts does, and switch this to match.
const HELP_NO_MATCH_REPLY =
  "I couldn't find anything in the DukaNest help center about that. You can browse the full guide at dukanest.com/help, or try rephrasing your question.";

interface HelpArticleCandidate {
  id: string;
  slug: string;
  title: string;
  content: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function searchHelpArticles(query: string): Promise<HelpArticleCandidate[]> {
  const ftsResults = await prisma.$queryRaw<HelpArticleCandidate[]>`
    SELECT id, slug, title, content
    FROM user_guide_articles
    WHERE
      is_active = true
      AND to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', ${query})
    ORDER BY ts_rank(to_tsvector('english', title || ' ' || content), plainto_tsquery('english', ${query})) DESC
    LIMIT ${HELP_CANDIDATE_LIMIT}
  `;

  if (ftsResults.length > 0) return ftsResults;

  // Fallback for short/typo queries the FTS index misses — same pattern as
  // products/route.ts's ILIKE fallback.
  const likeTerm = `%${query.trim()}%`;
  return prisma.$queryRaw<HelpArticleCandidate[]>`
    SELECT id, slug, title, content
    FROM user_guide_articles
    WHERE
      is_active = true
      AND (title ILIKE ${likeTerm} OR content ILIKE ${likeTerm})
    ORDER BY sort_order ASC
    LIMIT ${HELP_CANDIDATE_LIMIT}
  `;
}

const helpAnswerSchema = {
  type: 'object',
  properties: {
    answered: { type: 'boolean' },
    answer: { type: 'string' },
    citedSlugs: { type: 'array', items: { type: 'string' } },
  },
  required: ['answered', 'answer', 'citedSlugs'],
  additionalProperties: false,
} as const;

interface HelpAnswerResult {
  answered: boolean;
  answer: string;
  citedSlugs: string[];
}

function buildHelpSystemPrompt(candidates: HelpArticleCandidate[]): string {
  const context = candidates
    .map((c, i) => `[Article ${i + 1}] Title: "${c.title}" | Slug: ${c.slug}\n${stripHtml(c.content).slice(0, 3000)}`)
    .join('\n\n');

  return [
    'You are the help assistant for DukaNest, answering questions about how to use the DukaNest store dashboard.',
    'Answer ONLY using the article excerpts provided below — never use outside knowledge about ecommerce platforms in general, and never guess at DukaNest-specific UI details that are not in the excerpts.',
    'If the excerpts answer the question, set answered to true, write a clear answer in at most 4 sentences, and list the exact slug(s) of every article you actually used in citedSlugs.',
    'If the excerpts do not contain enough to answer the question, set answered to false, answer to an empty string, and citedSlugs to an empty array — do not guess or give a partial answer.',
    'Return ONLY valid JSON with no markdown and no extra prose.',
    `\n\nArticle excerpts:\n${context}`,
  ].join(' ');
}

export async function handleHelpQuestion(messages: ChatMessage[]): Promise<HandlerResult> {
  const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  const candidates = await searchHelpArticles(latestUserMessage);

  if (candidates.length === 0) {
    return { intent: 'help_question', answer: HELP_NO_MATCH_REPLY, usage: { inputTokens: 0, outputTokens: 0 } };
  }

  const { data, usage } = await generateJsonFromConversation<HelpAnswerResult>({
    system: buildHelpSystemPrompt(candidates),
    messages,
    schema: helpAnswerSchema,
    maxTokens: 500,
  });

  if (!data.answered || !data.answer.trim()) {
    return { intent: 'help_question', answer: HELP_NO_MATCH_REPLY, usage };
  }

  // Don't trust Claude's citedSlugs verbatim — only pass through slugs that
  // were actually among the retrieved candidates.
  const candidateSlugs = new Set(candidates.map((c) => c.slug));
  const validCitedSlugs = (data.citedSlugs ?? []).filter((slug) => candidateSlugs.has(slug));
  const citedArticles = candidates
    .filter((c) => validCitedSlugs.includes(c.slug))
    .map((c) => ({ title: c.title, slug: c.slug, url: `https://www.dukanest.com/help/${c.slug}` }));

  return {
    intent: 'help_question',
    answer: data.answer.trim(),
    data: { citedArticles },
    usage,
  };
}

// ---------------------------------------------------------------------------
// next_steps handler
// ---------------------------------------------------------------------------

// Static nav metadata (href/cta/priority) for each getting-started item id.
// Deliberately NOT imported from src/app/api/dashboard/getting-started/route.ts
// (which hand-lists the same items with these exact hrefs, for the real
// dashboard home page's checklist widget) to avoid touching that live,
// already-working route — this mirrors it instead. If these drift apart
// it's a UI polish issue (a stale link), not a correctness bug — the
// completion states themselves (the part that actually matters) come from
// the one real shared function, buildGettingStartedProgress(), not a copy.
//
// Web hrefs are relative dashboard paths (e.g. /dashboard/products/new).
// Mobile needs its own hrefs (app routes, not web URLs) — see
// MOBILE_NEXT_STEPS_META below; both are passed in by the caller rather
// than hardcoded here, so this module stays platform-agnostic.
export interface NextStepsNavMeta {
  hrefTemplate: (storeUrl: string, shippingMethodType?: string | null) => string;
  cta: string;
  priority: number;
}

export const WEB_NEXT_STEPS_META: Record<string, NextStepsNavMeta> = {
  category: { hrefTemplate: () => '/dashboard/categories/new', cta: 'Add category', priority: 1 },
  product: { hrefTemplate: () => '/dashboard/products/new', cta: 'Add product', priority: 2 },
  preview: { hrefTemplate: (storeUrl) => storeUrl, cta: 'Preview store', priority: 3 },
  share: { hrefTemplate: (storeUrl) => storeUrl, cta: 'Copy link', priority: 4 },
  contact_phone: { hrefTemplate: () => '/dashboard/settings', cta: 'Add phone', priority: 5 },
  payment: { hrefTemplate: () => '/dashboard/settings', cta: 'Set up payments', priority: 6 },
  delivery: {
    hrefTemplate: (_storeUrl, shippingMethodType) =>
      shippingMethodType === 'delivery_zones' ? '/dashboard/settings/delivery-zones' : '/dashboard/settings',
    cta: 'Configure shipping',
    priority: 7,
  },
  logo: { hrefTemplate: () => '/dashboard/settings', cta: 'Add logo', priority: 8 },
  // Rarely surfaced in practice — by the time a merchant asks the assistant
  // "what should I do next", they've already sent a message, which is what
  // marks this item complete. Kept here anyway so it renders correctly on
  // the (harmless) chance of a race on someone's very first-ever message.
  assistant: { hrefTemplate: () => '/dashboard?openAssistant=1', cta: 'Try it', priority: 9 },
  demo_products: { hrefTemplate: () => '/dashboard/products', cta: 'Remove demo products', priority: 10 },
};

/**
 * "What should I do next?" — the exact question a merchant asks right after
 * finishing store creation, before they've learned their way around the
 * dashboard/app. No Claude call for the actual answer: this reuses the SAME
 * buildGettingStartedProgress() the real checklist widget uses on both
 * platforms, so the assistant's answer can never disagree with what's shown
 * elsewhere in the app. Templated, not generated.
 *
 * @param navMeta Platform-specific href/cta/priority map — WEB_NEXT_STEPS_META
 * for the web route, or a Flutter-app-route equivalent for mobile.
 * @param includeAssistantItem Whether this platform has an assistant entry
 * point to link the 'assistant' checklist item to — see
 * buildGettingStartedProgress()'s own doc comment for why this defaults to
 * false and must be opted into explicitly per platform.
 */
export async function handleNextSteps(
  tenant: Tenant,
  navMeta: Record<string, NextStepsNavMeta>,
  includeAssistantItem: boolean,
): Promise<HandlerResult> {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
  const storeUrl = `https://${tenant.subdomain}.${baseDomain}`;

  const [productCount, categoryCount, activeDemoProductCount, deliveryZoneCount, settings] = await Promise.all([
    prisma.products.count({ where: { tenant_id: tenant.id, status: 'active', created_by: { not: null } } }),
    prisma.categories.count({ where: { tenant_id: tenant.id } }),
    countActiveDemoProducts(tenant.id),
    prisma.delivery_zones.count({ where: { tenant_id: tenant.id, is_active: true } }),
    getStaticOptions(tenant.id, [...GETTING_STARTED_OPTION_NAMES]),
  ]);

  const progress = buildGettingStartedProgress({
    productCount,
    categoryCount,
    activeDemoProductCount,
    deliveryZoneCount,
    settings,
    includeAssistantItem,
  });
  const zeroUsage: AiUsage = { inputTokens: 0, outputTokens: 0 };

  if (progress.completedCount === progress.totalCount) {
    return {
      intent: 'next_steps',
      answer: "You've completed every setup step — your store is fully configured! 🎉",
      data: { completedCount: progress.completedCount, totalCount: progress.totalCount, allComplete: true, steps: [] },
      usage: zeroUsage,
    };
  }

  const steps = progress.items
    .filter((item) => !item.completed)
    .map((item) => {
      const meta = navMeta[item.id];
      return {
        id: item.id,
        label: item.label,
        description: item.description,
        href: meta ? meta.hrefTemplate(storeUrl, settings.shipping_method_type) : '/dashboard',
        cta: meta?.cta ?? 'Go',
        priority: meta?.priority ?? 999,
      };
    })
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);

  const lines = steps.map((s, i) => `${i + 1}. ${s.label} — ${s.description}`);
  const answer = `You're ${progress.completedCount}/${progress.totalCount} through store setup. Here's what to do next:\n${lines.join('\n')}`;

  return {
    intent: 'next_steps',
    answer,
    data: { completedCount: progress.completedCount, totalCount: progress.totalCount, allComplete: false, steps },
    usage: zeroUsage,
  };
}

// ---------------------------------------------------------------------------
// business_advice handler
// ---------------------------------------------------------------------------

// Deliberately different grounding from every other intent above: there is
// no real DukaNest data or document that contains "what categories should a
// pet store have" — that's retail expertise, not a fact about this tenant
// or this platform. Two things keep this honest rather than a step back
// toward unconstrained guessing: (1) it's given the tenant's REAL
// business_type/niche/existing catalog as context, so advice isn't generic;
// (2) the prompt requires it be framed as suggestions the merchant can
// adapt, never as directives or facts. Pricing is the one place a real
// number could sound authoritative while being pure invention, so it's
// handled specially — see below.
const businessAdviceSchema = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    // true only for "how much should I charge for [one specific existing
    // product]" — general pricing-strategy questions ("how should I think
    // about pricing") are answered directly in `answer`, no product lookup.
    needsProductPricing: { type: 'boolean' },
    referencedProductName: { type: ['string', 'null'] },
    // true for "what's my business type/niche" — a readback of their own
    // recorded profile, not advice. Handled specially below: `answer` is
    // IGNORED and overwritten with a template built from the real stored
    // values, not trusted from Claude, even though the model was given the
    // true values in its own system prompt — same "state the fact in code,
    // don't trust the model to restate it" discipline as every other real
    // number in this assistant.
    isProfileReadback: { type: 'boolean' },
  },
  required: ['answer', 'needsProductPricing', 'referencedProductName', 'isProfileReadback'],
  additionalProperties: false,
} as const;

interface BusinessAdviceResult {
  answer: string;
  needsProductPricing: boolean;
  referencedProductName: string | null;
  isProfileReadback: boolean;
}

function buildBusinessAdviceSystemPrompt(businessType: string | null, niche: string | null, categoryNames: string[], productNames: string[]): string {
  return [
    'You are a retail business advisor for a DukaNest merchant — give practical, specific advice about running their business, not generic platitudes and not information about DukaNest itself.',
    businessType
      ? `Their business type is "${businessType}"${niche ? ` and their niche is "${niche}"` : ' (their specific niche has not been shared — give advice at the business-type level, and you may suggest they share more detail via onboarding for sharper suggestions)'}.`
      : 'Their business type has not been recorded yet — answer as generally as you reasonably can and suggest they complete their store profile for more specific advice.',
    categoryNames.length > 0 ? `Categories they already have: ${categoryNames.join(', ')}. Do not suggest duplicates of these.` : 'They have no categories set up yet.',
    productNames.length > 0 ? `A sample of products they already sell: ${productNames.slice(0, 40).join(', ')}.` : undefined,
    'If they are asking what their OWN recorded business type or niche IS (not asking for advice) — e.g. "what\'s my business type", "what niche did I register as" — set isProfileReadback to true. Leave answer as anything, it will be replaced with the real recorded value server-side.',
    'Always frame suggestions as options to adapt, never as directives — phrases like "you might consider" or "a common approach is", not "you must" or "you should always". You do not know their customers or local market as well as they do.',
    'If the question is asking you to name a price for ONE SPECIFIC product they already have (e.g. "how much should I charge for my leather wallet"), do NOT invent a number yourself — set needsProductPricing to true, set referencedProductName to the exact matching name from their product list above (best match if not exact), and set answer to a short holding line like "Let me check your cost for that." A real calculation will be filled in server-side from their actual recorded cost.',
    'For a general pricing-strategy question (not naming one specific product) — e.g. "how should I price my products" — answer directly with real methodology (cost-plus with a margin range, competitor-anchored pricing, perceived value) and leave needsProductPricing false. Never invent a specific number with nothing behind it.',
    'For everything else (categories, attributes, product ideas, general business questions), just answer directly in `answer` and leave needsProductPricing false, referencedProductName null, isProfileReadback false.',
    'Keep answers focused and practical — a short paragraph or a few bullet-style sentences, not an essay.',
    'Return ONLY valid JSON with no markdown and no extra prose.',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Builds the real profile-readback answer from actual stored values — never trusts Claude to restate them. */
function buildProfileReadbackAnswer(businessType: string | null, niche: string | null): string {
  if (businessType && niche) {
    return `Your recorded business type is "${businessType}" and your niche is "${niche}".`;
  }
  if (businessType) {
    return `Your recorded business type is "${businessType}". You haven't shared a specific niche yet — you can add one through the onboarding chat for more tailored suggestions.`;
  }
  return "I don't see a business type recorded for your store yet.";
}

function formatKesAmount(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

/**
 * Business/retail advice grounded in the tenant's real business_type/niche
 * (from tenants.data, written at registration and optionally enriched via
 * the onboarding chat) and real existing catalog — never DukaNest docs or
 * store transaction data, which is what makes this a genuinely different
 * intent from help_question/data_query. Pricing-for-a-specific-product
 * questions are answered from a REAL recorded cost_price with a templated
 * markup range computed in code, never Claude arithmetic — same "don't
 * trust Claude with the math" discipline as resolveDateRange() above.
 */
export async function handleBusinessAdvice(messages: ChatMessage[], tenant: Tenant): Promise<HandlerResult> {
  const { businessType, niche } = getBusinessProfile(tenant);

  const [categories, products] = await Promise.all([
    prisma.categories.findMany({ where: { tenant_id: tenant.id, status: 'active' }, select: { name: true }, take: 100 }),
    prisma.products.findMany({ where: { tenant_id: tenant.id, status: 'active' }, select: { name: true, cost_price: true, price: true }, take: 200 }),
  ]);

  const { data, usage } = await generateJsonFromConversation<BusinessAdviceResult>({
    system: buildBusinessAdviceSystemPrompt(businessType, niche, categories.map((c) => c.name), products.map((p) => p.name)),
    messages,
    schema: businessAdviceSchema,
    maxTokens: 500,
  });

  if (data.isProfileReadback) {
    return { intent: 'business_advice', answer: buildProfileReadbackAnswer(businessType, niche), usage };
  }

  if (!data.needsProductPricing || !data.referencedProductName) {
    return { intent: 'business_advice', answer: data.answer.trim(), usage };
  }

  // Resolve against the REAL product list — never trust the name verbatim,
  // same discipline as category-name resolution in handleDataQuery().
  const matched = products.find((p) => p.name.toLowerCase() === data.referencedProductName!.toLowerCase());

  if (!matched) {
    return {
      intent: 'business_advice',
      answer: `I couldn't find "${data.referencedProductName}" in your catalog to check its cost. In general, a common approach is cost-plus pricing: take what the item costs you, add a margin (often 40-60% in retail, higher for unique/handmade items), and adjust for what similar products sell for.`,
      usage,
    };
  }

  const costPrice = matched.cost_price != null ? Number(matched.cost_price) : null;
  if (costPrice == null || costPrice <= 0) {
    return {
      intent: 'business_advice',
      answer: `"${matched.name}" doesn't have a recorded cost price yet, so I can't calculate a real suggestion — add one on the product's edit page and ask me again. In the meantime, a common approach is cost-plus pricing: cost + a 40-60% margin, adjusted for what similar products sell for.`,
      usage,
      data: { referencedProduct: matched.name },
    };
  }

  const low = Math.round(costPrice * 1.4);
  const high = Math.round(costPrice * 1.6);
  const currentPrice = matched.price != null ? Number(matched.price) : null;
  const currentPriceNote = currentPrice != null ? ` Your current price is ${formatKesAmount(currentPrice)}.` : '';

  return {
    intent: 'business_advice',
    answer: `Your recorded cost for "${matched.name}" is ${formatKesAmount(costPrice)}.${currentPriceNote} A common retail margin of 40-60% would put a reasonable price between ${formatKesAmount(low)} and ${formatKesAmount(high)} — adjust based on your market, competition, and perceived value.`,
    data: { referencedProduct: matched.name, costPrice, suggestedRange: { low, high } },
    usage,
  };
}
