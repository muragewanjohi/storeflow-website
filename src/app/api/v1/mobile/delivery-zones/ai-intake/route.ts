/**
 * Conversational Delivery-Zone Intake (mobile/Flutter) — bearer-token
 * mirror of src/app/api/delivery-zones/ai-intake/route.ts.
 *
 * Runs the EXACT same collection prompt/schema as web, imported from
 * @/lib/delivery-zones/zone-intake-shared — nothing about the Claude
 * prompt or the real existing-zone lookup is reimplemented or forked for
 * mobile. Does NOT create the zone itself (Pattern A, see that module's
 * docblock) — the Flutter chat screen takes `collected` once `done:true`
 * and calls the existing POST /api/v1/mobile/dashboard/delivery-zones.
 *
 * Real differences from the web route: same three as
 * products/ai-intake's mobile mirror — bearer auth, mobile envelope, no
 * `bucket` (always 'monthly').
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
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

    const guard = await guardAiRequest(tenant, 'delivery_zone_intake', 'monthly');
    if (!guard.ok) {
      const guardBody = await guard.response.json().catch(() => ({ error: 'Request blocked.' }));
      const status = guard.response.status;
      const code = status === 429 ? 'RATE_LIMITED' : 'FORBIDDEN';
      return NextResponse.json(mobileError(code, guardBody.error ?? 'Request blocked.'), { status });
    }

    const { data, usage } = await runZoneIntakeTurn(tenant.id, input.messages);

    const estimatedCost = estimateCostUsd(usage);
    await recordAiUsage({
      tenantId: tenant.id,
      feature: 'delivery_zone_intake',
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
    console.error('[Mobile Delivery Zone AI Intake] Error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'AI delivery-zone setup is temporarily unavailable. You can add the zone with the form instead.'),
      { status: 502 }
    );
  }
}
