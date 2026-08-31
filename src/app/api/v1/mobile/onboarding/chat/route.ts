/**
 * Onboarding AI Chat — mobile/Flutter mirror (OC.3, docs/IMPLEMENTATION_TRACKER.md).
 *
 * Bearer-token mirror of src/app/api/onboarding/chat/route.ts. Runs the
 * EXACT same system prompt, response schema, and turn-shaping logic,
 * imported from @/lib/onboarding/chat-shared — nothing about the Claude
 * prompt is reimplemented or forked for mobile, same discipline as
 * /api/v1/mobile/assistant/chat's relationship to its web counterpart.
 *
 * Real differences from the web route:
 *  1. Auth: requireMobileTenantStaff() (bearer token) instead of
 *     requireAuth()+requireTenant() (cookie session).
 *  2. Response envelope: {success, data}/{success:false, error} (mobileSuccess/
 *     mobileError), including guardAiRequest's rate-limit/quota response,
 *     which is not mobile-shaped by default and is translated here exactly
 *     like the mobile assistant route does.
 *
 * Stateless per request, same as web — the Flutter client resends the full
 * message history each turn; no server-side conversation table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
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

    const guard = await guardAiRequest(tenant, 'onboarding_intake', 'setup');
    if (!guard.ok) {
      const guardBody = await guard.response.json().catch(() => ({ error: 'Request blocked.' }));
      const status = guard.response.status;
      const code = status === 429 ? 'RATE_LIMITED' : 'FORBIDDEN';
      return NextResponse.json(mobileError(code, guardBody.error ?? 'Request blocked.'), { status });
    }

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

    return NextResponse.json(
      mobileSuccess({
        reply: data.reply,
        done: data.done,
        collected: data.collected,
        usage: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          estimatedCostUsd: estimatedCost,
        },
      })
    );
  } catch (error) {
    console.error('[Mobile Onboarding AI Chat] Error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'The onboarding assistant is temporarily unavailable.'),
      { status: 502 }
    );
  }
}
