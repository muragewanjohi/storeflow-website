/**
 * Dashboard AI Assistant (mobile/Flutter) — Phase 1-3 of the Flutter
 * discoverability plan (docs/IMPLEMENTATION_TRACKER.md, "Flutter" section).
 *
 * Bearer-token mirror of src/app/api/assistant/chat/route.ts. Runs the EXACT
 * same data_query/help_question/next_steps logic as web, imported from
 * @/lib/assistant/shared — nothing about the Claude prompts, the real
 * Prisma queries, or the retrieval-grounding discipline is reimplemented or
 * forked for mobile.
 *
 * Real differences from the web route:
 *  1. Auth: requireMobileTenantStaff() (bearer token) instead of
 *     requireAuth()+requireTenant() (cookie session) — same helper every
 *     other /api/v1/mobile/* route already uses.
 *  2. `configuration_guidance`'s ANSWER, not its classification (that part
 *     is shared — see @/lib/assistant/shared's config-target exports). Web
 *     hands off to a chat flow (POST /api/products/ai-intake) driven by its
 *     own assistant-panel.tsx; Flutter now does the same against the mobile
 *     mirror (POST /api/v1/mobile/products/ai-intake) — the merchant said
 *     the assistant should actually create products/categories, not just
 *     point at the manual form, so handleMobileConfigurationGuidance()
 *     below returns { target: 'product_intake', endpoint: '...' } and the
 *     Flutter chat screen switches into product-intake mode, driving that
 *     endpoint turn by turn until done:true, then calling the existing
 *     POST /api/v1/mobile/dashboard/products.
 *
 *     This exists because of a real gap found via live testing on BOTH
 *     platforms: "How do I add a product?" used to classify as
 *     help_question and decline (confirmed via direct SQL — no help
 *     article literally contains the word "add") — a dead end even though
 *     the assistant could actually help. buildClassifySystemPrompt() now
 *     special-cases add-a-product questions to prefer configuration_guidance
 *     regardless of phrasing, on both platforms.
 *
 * Responses use the mobile envelope ({success, data} / {success:false,
 * error}) every other /api/v1/mobile/* route uses — including guardAiRequest's
 * rate-limit/quota response, which is NOT mobile-shaped by default and gets
 * translated here (Flutter's ApiResponse.fromJson requires a `success`
 * field; passing guardAiRequest's raw web-shaped {error} straight through
 * would fail to parse client-side).
 *
 * next_steps/configuration_guidance hrefs (MOBILE_NEXT_STEPS_META) point at
 * real Flutter router paths (confirmed against router.dart).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import type { Tenant } from '@/lib/tenant-context';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { generateJsonFromConversation, estimateCostUsd, type AiUsage } from '@/lib/ai/claude-client';
import { recordAiUsage } from '@/lib/ai/usage';
import { guardAiRequest } from '@/lib/ai/guard';
import { prisma } from '@/lib/prisma/client';
import {
  type ChatMessage,
  type HandlerResult,
  type NextStepsNavMeta,
  type ConfigTargetParseResult,
  buildClassifySystemPrompt,
  classifySchema,
  isIntent,
  unclearReply,
  handleDataQuery,
  handleHelpQuestion,
  handleNextSteps,
  handleBusinessAdvice,
  handleSocialContent,
  handleCategoryConfigTarget,
  handleHomepageImageConfigTarget,
  handleMarketingImagesConfigTarget,
  getBusinessProfile,
  configTargetSchema,
  buildConfigTargetSystemPrompt,
  resolveConfigTarget,
} from '@/lib/assistant/shared';

export const dynamic = 'force-dynamic';

const MAX_MESSAGES = 20;

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      })
    )
    .min(1, 'At least one message is required')
    .max(MAX_MESSAGES, 'Conversation is too long — please ask a fresh question.'),
});

// Real Flutter router.dart paths (confirmed by reading the router).
const MOBILE_NEXT_STEPS_META: Record<string, NextStepsNavMeta> = {
  category: { hrefTemplate: () => '/categories', cta: 'Add category', priority: 1 },
  product: { hrefTemplate: () => '/products', cta: 'Add product', priority: 2 },
  preview: { hrefTemplate: (storeUrl) => storeUrl, cta: 'Preview store', priority: 3 },
  share: { hrefTemplate: (storeUrl) => storeUrl, cta: 'Copy link', priority: 4 },
  contact_phone: { hrefTemplate: () => '/settings', cta: 'Add phone', priority: 5 },
  payment: { hrefTemplate: () => '/payment-settings', cta: 'Set up payments', priority: 6 },
  delivery: { hrefTemplate: () => '/shipping-delivery', cta: 'Configure shipping', priority: 7 },
  logo: { hrefTemplate: () => '/settings', cta: 'Add logo', priority: 8 },
  // Flutter Phase 3 gave the assistant a real center-tab entry point
  // (/assistant, a StatefulShellBranch) — Phase 4 flips this on now that
  // there's somewhere real to send the merchant. Rarely actually surfaced
  // in practice for the same reason as web's equivalent entry: by the time
  // a merchant asks the assistant "what's next" from inside the assistant
  // itself, they've already sent a message, which is what marks this item
  // complete (see includeAssistantItem below).
  assistant: { hrefTemplate: () => '/assistant', cta: 'Try it', priority: 9 },
  demo_products: { hrefTemplate: () => '/products', cta: 'Remove demo products', priority: 10 },
};

const MOBILE_CONFIG_UNSUPPORTED_REPLY =
  "I can help you add a new product or category, regenerate one of your homepage images, generate a new marketing image, or set up a delivery zone right now. Guided setup for other things (like themes) isn't available from here yet — check the relevant Settings screen for that in the meantime.";

/**
 * Mobile's answer for a resolved configuration_guidance target. See module
 * docblock — 'product_intake' now hands off to the Flutter chat screen's
 * product-intake mode (POST /api/v1/mobile/products/ai-intake), same shape
 * as web's hand-off, just a mobile endpoint path. 'category' can create for
 * real, same as web.
 */
async function handleMobileConfigurationGuidance(messages: ChatMessage[], tenant: Tenant): Promise<HandlerResult> {
  const { businessType, niche } = getBusinessProfile(tenant);
  const existingCategories = await prisma.categories.findMany({
    where: { tenant_id: tenant.id, status: 'active' },
    select: { name: true },
    take: 100,
  });

  const { data, usage } = await generateJsonFromConversation<ConfigTargetParseResult>({
    system: buildConfigTargetSystemPrompt(businessType, niche, existingCategories.map((c) => c.name)),
    messages,
    schema: configTargetSchema,
    maxTokens: 300,
  });

  const target = resolveConfigTarget(data.target);

  if (target === 'unsupported') {
    return { intent: 'configuration_guidance', answer: MOBILE_CONFIG_UNSUPPORTED_REPLY, data: { target: 'unsupported' }, usage };
  }

  if (target === 'category') {
    const result = await handleCategoryConfigTarget(tenant, data.categoryNames ?? [], data.suggestedCategoryNames ?? [], { href: '/categories/new', cta: 'Add category' });
    return { ...result, usage: { inputTokens: usage.inputTokens + result.usage.inputTokens, outputTokens: usage.outputTokens + result.usage.outputTokens } };
  }

  if (target === 'homepage_image') {
    const result = await handleHomepageImageConfigTarget(tenant, data.imageSlot ?? '', data.proposedImageSlot ?? '');
    return { ...result, usage: { inputTokens: usage.inputTokens + result.usage.inputTokens, outputTokens: usage.outputTokens + result.usage.outputTokens } };
  }

  if (target === 'delivery_zone') {
    return {
      intent: 'configuration_guidance',
      answer: "Sure — let's set up a delivery zone together. I'll ask you a few quick questions.",
      data: { target, endpoint: '/api/v1/mobile/delivery-zones/ai-intake' },
      usage,
    };
  }

  if (target === 'marketing_images') {
    const result = await handleMarketingImagesConfigTarget(
      tenant,
      data.marketingImageRequest ?? '',
      data.marketingImageCount ?? null,
      data.marketingImageConfirmed ?? false,
    );
    return { ...result, usage: { inputTokens: usage.inputTokens + result.usage.inputTokens, outputTokens: usage.outputTokens + result.usage.outputTokens } };
  }

  return {
    intent: 'configuration_guidance',
    answer: "Sure — let's add a new product together. I'll ask you a few quick questions.",
    data: { target, endpoint: '/api/v1/mobile/products/ai-intake' },
    usage,
  };
}

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenant } = gate.ctx;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid request',
          parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
        ),
        { status: 400 }
      );
    }
    const input = parsed.data;

    const guard = await guardAiRequest(tenant, 'assistant_query', 'monthly');
    if (!guard.ok) {
      const guardBody = await guard.response.json().catch(() => ({ error: 'Request blocked.' }));
      const status = guard.response.status;
      const code = status === 429 ? 'RATE_LIMITED' : 'FORBIDDEN';
      return NextResponse.json(mobileError(code, guardBody.error ?? 'Request blocked.'), { status });
    }

    const { data: classified, usage: classifyUsage } = await generateJsonFromConversation<{ intent: string }>({
      system: buildClassifySystemPrompt(true),
      messages: input.messages,
      schema: classifySchema,
      maxTokens: 60,
    });

    let result: HandlerResult;
    const intent = isIntent(classified.intent) ? classified.intent : 'unclear';

    if (intent === 'data_query') {
      result = await handleDataQuery(input.messages, tenant.id);
    } else if (intent === 'help_question') {
      result = await handleHelpQuestion(input.messages);
    } else if (intent === 'configuration_guidance') {
      result = await handleMobileConfigurationGuidance(input.messages, tenant);
    } else if (intent === 'next_steps') {
      result = await handleNextSteps(tenant, MOBILE_NEXT_STEPS_META, true);
    } else if (intent === 'business_advice') {
      result = await handleBusinessAdvice(input.messages, tenant);
    } else if (intent === 'social_content') {
      result = await handleSocialContent(input.messages, tenant);
    } else {
      result = { intent: 'unclear', answer: unclearReply(true), usage: { inputTokens: 0, outputTokens: 0 } };
    }

    const totalUsage: AiUsage = {
      inputTokens: classifyUsage.inputTokens + result.usage.inputTokens,
      outputTokens: classifyUsage.outputTokens + result.usage.outputTokens,
    };
    const estimatedCost = estimateCostUsd(totalUsage);
    await recordAiUsage({
      tenantId: tenant.id,
      feature: 'assistant_query',
      bucket: 'monthly',
      usage: totalUsage,
      estimatedCost,
      itemCount: 1,
    });

    return NextResponse.json(
      mobileSuccess({
        intent: result.intent,
        answer: result.answer,
        data: result.data ?? null,
        usage: {
          inputTokens: totalUsage.inputTokens,
          outputTokens: totalUsage.outputTokens,
          estimatedCostUsd: estimatedCost,
        },
      })
    );
  } catch (error) {
    console.error('[Mobile Dashboard AI Assistant] Error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'The assistant is temporarily unavailable.'),
      { status: 502 }
    );
  }
}
