/**
 * Theme Track B2.2 — AI-assisted styling from a reference-site screenshot
 * ("make it feel like this site").
 *
 * POST: generate-then-preview only (Pattern A, same as B2.1's
 * /api/themes/ai-style) — captures a real screenshot of the given URL,
 * feeds it to Claude vision, returns a proposed custom_colors/custom_fonts
 * payload. Never writes to tenant_themes itself; the merchant applies it
 * via the existing PUT /api/themes/current.
 *
 * maxDuration set explicitly and generously: this is a real, synchronous,
 * multi-step chain the merchant is waiting on (launch a headless browser,
 * navigate, screenshot, then a Claude vision call) that can genuinely take
 * 10-20+ seconds — a real, previously-found bug class in this codebase
 * (see DA.40) was a slow background operation silently truncated by
 * Vercel's default function duration; explicit here rather than repeating
 * that mistake on a route that's even more likely to run long.
 *
 * Quota: same 'theme_styling' AiFeature B2.1 already uses (5 passes in the
 * one-time 'setup' bucket, unlimited/rate-limited-only in 'monthly') — a
 * screenshot-styling request is the same kind of spend as a text one, not
 * a separate budget.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { estimateCostUsd } from '@/lib/ai/claude-client';
import { recordAiUsage } from '@/lib/ai/usage';
import { guardAiRequest } from '@/lib/ai/guard';
import { generateThemeStyleFromScreenshot } from '@/lib/themes/ai-style';
import { captureUrlScreenshot } from '@/lib/themes/screenshot-capture';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const requestSchema = z.object({
  url: z.string().min(1, 'Enter a URL to style from').max(2000),
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

    const capture = await captureUrlScreenshot(input.url);
    if (!capture.success) {
      return NextResponse.json({ error: capture.error }, { status: 400 });
    }

    const { data, usage } = await generateThemeStyleFromScreenshot({
      imageBase64: capture.imageBase64,
      mediaType: capture.mediaType,
    });

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

    console.error('[Theme AI Styling From URL] Error:', error);
    return NextResponse.json(
      { error: 'AI styling is temporarily unavailable. Please try again in a moment.' },
      { status: 502 }
    );
  }
}
