/**
 * Theme Track B2.1 — AI-assisted styling from a free-text mood prompt.
 *
 * POST: generate-then-preview only (Pattern A, same as
 * /api/products/ai-description) — returns a proposed custom_colors/
 * custom_fonts payload, never writes to tenant_themes itself. The merchant
 * applies it via the existing PUT /api/themes/current (already real
 * sanitized/gated for custom_css by Theme Track B1.4 — this route never
 * touches custom_css/custom_js at all).
 *
 * Quota: 'theme_styling' AiFeature — already pre-wired in Phase 0
 * (5 passes in the one-time 'setup' bucket, unlimited/rate-limited-only
 * once in the 'monthly' bucket, per docs/AI_FEATURES_PLAN.md's plan-quota
 * table). Bucket is caller-specified, defaulting to 'monthly' — same
 * "the safer default so a frontend bug can't accidentally drain the larger
 * one-time allowance" reasoning as AI Phase 1's description routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { estimateCostUsd } from '@/lib/ai/claude-client';
import { recordAiUsage } from '@/lib/ai/usage';
import { guardAiRequest } from '@/lib/ai/guard';
import { generateThemeStyleFromPrompt } from '@/lib/themes/ai-style';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  prompt: z.string().min(2, 'Describe the mood or style you want').max(300),
  bucket: z.enum(['setup', 'monthly']).default('monthly'),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const body = await request.json();
    const input = requestSchema.parse(body);

    const guard = await guardAiRequest(tenant, 'theme_styling', input.bucket);
    if (!guard.ok) return guard.response;

    const { data, usage } = await generateThemeStyleFromPrompt({ prompt: input.prompt });

    const estimatedCost = estimateCostUsd(usage);
    await recordAiUsage({
      tenantId: tenant.id,
      feature: 'theme_styling',
      bucket: input.bucket,
      usage,
      estimatedCost,
      itemCount: 1,
    });

    return NextResponse.json({
      custom_colors: data.colors,
      custom_fonts: data.typography,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostUsd: estimatedCost,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Tenant not found') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    console.error('[Theme AI Styling] Error:', error);
    return NextResponse.json(
      { error: 'AI styling is temporarily unavailable. Please try again in a moment.' },
      { status: 502 }
    );
  }
}
