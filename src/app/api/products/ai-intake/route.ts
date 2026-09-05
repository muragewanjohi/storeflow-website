/**
 * Conversational Product Intake — AI Phase 1.1 (docs/AI_FEATURES_PLAN.md)
 *
 * Reuses the multi-turn pattern proven by OC.1 (docs/ONBOARDING_AI_CHAT_PLAN.md,
 * src/app/api/onboarding/chat/route.ts) — same generateJsonFromConversation
 * primitive, same stateless-per-request shape, different target fields and
 * a different completion action. Collects name/price/stock/category/SKU
 * conversationally; does NOT create the product itself (Pattern A — the
 * caller takes `collected` and calls the existing POST /api/products, same
 * separation OC.1 uses with POST /api/onboarding/starter-pack).
 *
 * This is a collection-UX feature, not a content-generation one — like
 * onboarding_intake, expense_categorization, and delivery_zone_intake, it's
 * quota-exempt (rate-limited only), distinct from product_description
 * (Phase 1.2/1.3), which IS quota-counted because it's the thing actually
 * generating content the merchant keeps.
 *
 * The turn logic (prompt/schema/category lookup) is shared with the mobile
 * mirror (src/app/api/v1/mobile/products/ai-intake/route.ts) via
 * @/lib/products/ai-intake-shared — only auth and response envelope differ.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
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
  bucket: z.enum(['setup', 'monthly']).default('monthly'),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const body = await request.json();
    const input = requestSchema.parse(body);

    const guard = await guardAiRequest(tenant, 'product_intake', input.bucket);
    if (!guard.ok) return guard.response;

    const { data, usage } = await runProductIntakeTurn(tenant.id, input.messages);

    const estimatedCost = estimateCostUsd(usage);
    await recordAiUsage({
      tenantId: tenant.id,
      feature: 'product_intake',
      bucket: input.bucket,
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

    console.error('[Product AI Intake] Error:', error);
    return NextResponse.json(
      { error: 'AI product intake is temporarily unavailable. You can add the product with the form instead.' },
      { status: 502 }
    );
  }
}
