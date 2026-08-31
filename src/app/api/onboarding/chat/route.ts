/**
 * Onboarding AI Chat — OC.1 (docs/ONBOARDING_AI_CHAT_PLAN.md)
 *
 * CORRECTED SCOPE (see IMPLEMENTATION_TRACKER.md OC.2 note): the plan doc's
 * original premise — that `dashboard/onboarding/starter-pack/page.tsx` is a
 * real merchant-facing form this chat replaces — turned out to be wrong on
 * inspection; that page is an internal generation-testing harness. The real
 * production flow collects `businessType` inline on /register (a dropdown)
 * and generates starter-pack content server-side during
 * POST /api/tenants/register itself, with no separate post-registration
 * screen today. This chat is therefore ADDITIVE, not a replacement: an
 * optional post-registration step that collects a richer `niche` than the
 * registration dropdown captured, plus confirms/refines `businessType`, and
 * saves that context to the tenant record for future AI personalization
 * (descriptions, marketing tone) — it does NOT re-trigger starter-pack
 * generation, to avoid risking duplicate content/cost from calling that
 * 1700-line pipeline a second time without having verified it's safe to
 * re-run. See `PATCH /api/tenant/business-context`, which is what the
 * frontend calls on done:true instead.
 *
 * If the caller already knows businessType (e.g. from the tenant record,
 * set at registration), pass it as `knownBusinessType` — the assistant will
 * skip asking for it and focus questions on niche only.
 *
 * Stateless per request: the client resends the full message history each
 * turn (see generateJsonFromConversation in claude-client.ts) — no server-
 * side conversation table. Designed to be the reusable pattern AI Phase 1.1
 * (product intake) and 7.1 (delivery-zone intake) build on later, with
 * their own system prompt + schema, not their own chat plumbing.
 *
 * The system prompt, response schema, and turn-shaping logic live in
 * @/lib/onboarding/chat-shared so the mobile bearer-token mirror (OC.3,
 * POST /api/v1/mobile/onboarding/chat) runs the identical conversation, not
 * a re-typed copy that can drift.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { generateJsonFromConversation, estimateCostUsd } from '@/lib/ai/claude-client';
import { recordAiUsage } from '@/lib/ai/usage';
import { guardAiRequest } from '@/lib/ai/guard';
import {
  ONBOARDING_CHAT_MAX_MESSAGES,
  onboardingChatResponseSchema,
  buildOnboardingChatSystemPrompt,
  withOnboardingChatKickoff,
  type OnboardingChatTurnResponse,
} from '@/lib/onboarding/chat-shared';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      })
    )
    .max(ONBOARDING_CHAT_MAX_MESSAGES, 'Conversation is too long — please restart onboarding.'),
  storeName: z.string().optional(),
  knownBusinessType: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const body = await request.json();
    const input = requestSchema.parse(body);

    const guard = await guardAiRequest(tenant, 'onboarding_intake', 'setup');
    if (!guard.ok) return guard.response;

    const messages = withOnboardingChatKickoff(input.messages);

    const { data, usage } = await generateJsonFromConversation<OnboardingChatTurnResponse>({
      system: buildOnboardingChatSystemPrompt(input.storeName, input.knownBusinessType),
      messages,
      schema: onboardingChatResponseSchema,
      maxTokens: 500,
    });

    const estimatedCost = estimateCostUsd(usage);
    await recordAiUsage({
      tenantId: tenant.id,
      feature: 'onboarding_intake',
      bucket: 'setup',
      usage,
      estimatedCost,
      itemCount: 1,
    });

    return NextResponse.json({
      reply: data.reply,
      done: data.done,
      collected: data.collected,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
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

    console.error('[Onboarding AI Chat] Error:', error);
    return NextResponse.json(
      {
        error:
          'The onboarding assistant is temporarily unavailable. You can set up your store with the form instead.',
      },
      { status: 502 }
    );
  }
}
