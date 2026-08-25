/**
 * Conversational Delivery-Zone Intake — AI Phase 7.1 (docs/AI_FEATURES_PLAN.md)
 *
 * Reuses the same multi-turn pattern as product_intake (AI Phase 1.1) —
 * same generateJsonFromConversation primitive, same stateless-per-request
 * shape, different target fields and a different completion action.
 * Collects name/price/locations conversationally; does NOT create the zone
 * itself (Pattern A — the caller takes `collected` once done:true and calls
 * the existing POST /api/admin/delivery-zones, same separation
 * product_intake uses with POST /api/products).
 *
 * Collection-UX feature, not content-generation — quota-exempt (rate-limited
 * only), same as product_intake/onboarding_intake/expense_categorization.
 *
 * Turn logic (prompt/schema/existing-zone lookup) shared with the mobile
 * mirror (src/app/api/v1/mobile/delivery-zones/ai-intake/route.ts) via
 * @/lib/delivery-zones/zone-intake-shared — only auth and response envelope
 * differ.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { estimateCostUsd } from '@/lib/ai/claude-client';
import { recordAiUsage } from '@/lib/ai/usage';
import { guardAiRequest } from '@/lib/ai/guard';
import { runZoneIntakeTurn } from '@/lib/delivery-zones/zone-intake-shared';

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

    const guard = await guardAiRequest(tenant, 'delivery_zone_intake', input.bucket);
    if (!guard.ok) return guard.response;

    const { data, usage } = await runZoneIntakeTurn(tenant.id, input.messages);

    const estimatedCost = estimateCostUsd(usage);
    await recordAiUsage({
      tenantId: tenant.id,
      feature: 'delivery_zone_intake',
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

    console.error('[Delivery Zone AI Intake] Error:', error);
    return NextResponse.json(
      { error: 'AI delivery-zone setup is temporarily unavailable. You can add the zone with the form instead.' },
      { status: 502 }
    );
  }
}
