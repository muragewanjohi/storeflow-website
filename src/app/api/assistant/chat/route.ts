/**
 * Dashboard AI Assistant (web) — intent routing + data_query (DA.1) +
 * help_question (DA.2) + configuration_guidance (DA.3) + next_steps
 * handlers (docs/DASHBOARD_AI_ASSISTANT_PLAN.md)
 *
 * data_query/help_question/next_steps/classification (including the
 * configuration_guidance TARGET classifier) live in @/lib/assistant/shared
 * — shared verbatim with the mobile route
 * (src/app/api/v1/mobile/assistant/chat/route.ts) so both platforms run the
 * exact same tested logic. Only the ANSWER for a resolved 'product_intake'
 * target differs per platform: web hands off to
 * POST /api/products/ai-intake for the frontend to drive a chat flow
 * directly (see handleConfigurationGuidance() below); mobile has no such
 * chat UI (Flutter already has a native product form) and returns a direct
 * navigational pointer instead — see the mobile route's own handler.
 *
 * All handlers are quota-counted under the single 'assistant_query'
 * feature/bucket (monthly) — per DA.0's resolved decision, this is one
 * merchant-facing assistant, not per-intent quotas.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import type { Tenant } from '@/lib/tenant-context';
import { generateJsonFromConversation, estimateCostUsd, type AiUsage } from '@/lib/ai/claude-client';
import { recordAiUsage } from '@/lib/ai/usage';
import { guardAiRequest } from '@/lib/ai/guard';
import { prisma } from '@/lib/prisma/client';
import {
  type ChatMessage,
  type HandlerResult,
  type ConfigTargetParseResult,
  buildClassifySystemPrompt,
  classifySchema,
  isIntent,
  unclearReply,
  handleDataQuery,
  handleHelpQuestion,
  handleNextSteps,
  handleBusinessAdvice,
  handleCategoryConfigTarget,
  handleHomepageImageConfigTarget,
  handleMarketingImagesConfigTarget,
  getBusinessProfile,
  WEB_NEXT_STEPS_META,
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

// ---------------------------------------------------------------------------
// configuration_guidance handler (DA.3) — target classification is shared
// (@/lib/assistant/shared); the answer for each resolved target is web-only
// here, see module docblock.
// ---------------------------------------------------------------------------

const CONFIG_UNSUPPORTED_REPLY =
  "I can help you add a new product or category, regenerate one of your homepage images, generate a new marketing image, or set up a delivery zone right now. Guided setup for other things (like themes) isn't available yet — check the Help Center or the relevant Settings page for that in the meantime.";

/**
 * Identifies which guided setup the merchant wants and answers it —
 * 'product_intake' hands off to a chat flow (does not run the multi-turn
 * collection itself, see module docblock); 'category' is answered directly
 * by handleCategoryConfigTarget() — real creation when the merchant already
 * named the category/categories, a pointer otherwise (shared with mobile,
 * see that function's docblock).
 */
async function handleConfigurationGuidance(messages: ChatMessage[], tenant: Tenant): Promise<HandlerResult> {
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
    return { intent: 'configuration_guidance', answer: CONFIG_UNSUPPORTED_REPLY, data: { target: 'unsupported' }, usage };
  }

  if (target === 'category') {
    const result = await handleCategoryConfigTarget(tenant, data.categoryNames ?? [], data.suggestedCategoryNames ?? [], {
      href: '/dashboard/categories/new',
      cta: 'Add category',
    });
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
      data: { target, endpoint: '/api/delivery-zones/ai-intake' },
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
    data: { target, endpoint: '/api/products/ai-intake' },
    usage,
  };
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const body = await request.json();
    const input = requestSchema.parse(body);

    const guard = await guardAiRequest(tenant, 'assistant_query', 'monthly');
    if (!guard.ok) return guard.response;

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
      result = await handleConfigurationGuidance(input.messages, tenant);
    } else if (intent === 'next_steps') {
      result = await handleNextSteps(tenant, WEB_NEXT_STEPS_META, true);
    } else if (intent === 'business_advice') {
      result = await handleBusinessAdvice(input.messages, tenant);
    } else {
      result = { intent: 'unclear', answer: unclearReply(true), usage: { inputTokens: 0, outputTokens: 0 } };
    }

    // One usage record per assistant turn, summing both Claude calls
    // (classify + handler) — a merchant's mental model is "I asked the
    // assistant one thing," not "two API calls happened."
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

    return NextResponse.json({
      intent: result.intent,
      answer: result.answer,
      data: result.data ?? null,
      usage: {
        inputTokens: totalUsage.inputTokens,
        outputTokens: totalUsage.outputTokens,
        estimatedCostUsd: estimatedCost,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Tenant not found') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    console.error('[Dashboard AI Assistant] Error:', error);
    return NextResponse.json(
      { error: 'The assistant is temporarily unavailable. Try checking the Analytics or Help pages directly.' },
      { status: 502 }
    );
  }
}
