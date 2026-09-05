/**
 * Conversational Product Intake (mobile/Flutter) — bearer-token mirror of
 * src/app/api/products/ai-intake/route.ts, per the user's explicit request
 * that the mobile assistant "be able to create them as previously" (not
 * just point at the manual form).
 *
 * Runs the EXACT same collection prompt/schema as web, imported from
 * @/lib/products/ai-intake-shared — nothing about the Claude prompt or the
 * real category lookup is reimplemented or forked for mobile. Does NOT
 * create the product itself (Pattern A, see that module's docblock) — the
 * Flutter chat screen takes `collected` once `done:true` and calls the
 * existing POST /api/v1/mobile/dashboard/products (resolving the returned
 * category NAME to an id via GET /api/v1/mobile/dashboard/categories first,
 * same as web's assistant-panel.tsx does against POST /api/products).
 *
 * Real differences from the web route:
 *  1. Auth: requireMobileTenantStaff() (bearer token) instead of
 *     requireAuth()+requireTenant() (cookie session).
 *  2. Response envelope: mobileSuccess()/mobileError() (Flutter's
 *     ApiResponse.fromJson requires a `success` field).
 *  3. No `bucket` — mobile always guards/records against 'monthly', mirroring
 *     every other mobile AI route (assistant/chat, business_advice, etc.);
 *     web's 'setup' bucket exists for the onboarding-chat-era product intake
 *     entry point, which mobile has no equivalent of.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { estimateCostUsd } from '@/lib/ai/claude-client';
import { recordAiUsage } from '@/lib/ai/usage';
import { guardAiRequest } from '@/lib/ai/guard';
import { runProductIntakeTurn } from '@/lib/products/ai-intake-shared';

export const dynamic = 'force-dynamic';

const MAX_MESSAGES = 40;

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      })
    )
    .max(MAX_MESSAGES, 'Conversation is too long — please restart.'),
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

    const guard = await guardAiRequest(tenant, 'product_intake', 'monthly');
    if (!guard.ok) {
      const guardBody = await guard.response.json().catch(() => ({ error: 'Request blocked.' }));
      const status = guard.response.status;
      const code = status === 429 ? 'RATE_LIMITED' : 'FORBIDDEN';
      return NextResponse.json(mobileError(code, guardBody.error ?? 'Request blocked.'), { status });
    }

    const { data, usage } = await runProductIntakeTurn(tenant.id, input.messages);

    const estimatedCost = estimateCostUsd(usage);
    await recordAiUsage({
      tenantId: tenant.id,
      feature: 'product_intake',
      bucket: 'monthly',
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
    console.error('[Mobile Product AI Intake] Error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'AI product intake is temporarily unavailable. You can add the product with the form instead.'),
      { status: 502 }
    );
  }
}
