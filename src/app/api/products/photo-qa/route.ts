/**
 * Product Photo QA — AI Phase 5 (docs/AI_FEATURES_PLAN.md)
 *
 * Vision analysis of a REAL, already-uploaded product photo — quality
 * feedback (blurry/dark/wrong background), a suggested alt text, a
 * suggested SEO description, and reshoot tips if it needs one. Never
 * generates or edits the image itself — no image-generation call happens
 * anywhere in this route. Purely advisory: this endpoint only returns
 * suggestions, it never writes to the product record itself — the caller
 * decides whether to show/apply any of them (e.g. copy the suggested text
 * into the description field), same "review before it's used" spirit as
 * legal-page drafts (Phase 7).
 *
 * Shares its actual QA logic with the mobile mirror
 * (src/app/api/v1/mobile/products/photo-qa/route.ts) via
 * @/lib/products/photo-qa-shared — only auth and response envelope differ.
 *
 * Quota-counted (unlike product_intake) — this IS the thing generating
 * content the merchant keeps (alt text/SEO copy), same reasoning as
 * product_description. Shares the descriptionsAndPhotoQa monthly counter
 * with product_description (see getAiFeatureLimit() in
 * @/lib/subscriptions/limits.ts) and its own setup-bucket allowance
 * (photoQaPasses) — both already declared in AiPlanLimits, no schema change
 * needed for this feature.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { estimateCostUsd } from '@/lib/ai/claude-client';
import { recordAiUsage } from '@/lib/ai/usage';
import { guardAiRequest } from '@/lib/ai/guard';
import { fetchImageAsBase64, runPhotoQa, PhotoFetchError } from '@/lib/products/photo-qa-shared';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  imageUrl: z.string().url('imageUrl must be a valid URL'),
  productName: z.string().min(1).max(255).optional(),
  bucket: z.enum(['setup', 'monthly']).default('monthly'),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const body = await request.json();
    const input = requestSchema.parse(body);

    const guard = await guardAiRequest(tenant, 'photo_qa', input.bucket);
    if (!guard.ok) return guard.response;

    const { base64, mediaType } = await fetchImageAsBase64(input.imageUrl);
    const { data, usage } = await runPhotoQa({
      imageBase64: base64,
      imageMediaType: mediaType,
      productName: input.productName,
    });

    const estimatedCost = estimateCostUsd(usage);
    await recordAiUsage({
      tenantId: tenant.id,
      feature: 'photo_qa',
      bucket: input.bucket,
      usage,
      estimatedCost,
      itemCount: 1,
    });

    return NextResponse.json({
      qualityScore: data.qualityScore,
      issues: data.issues,
      reshootSuggestions: data.reshootSuggestions,
      suggestedAltText: data.suggestedAltText,
      suggestedSeoDescription: data.suggestedSeoDescription,
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
    if (error instanceof PhotoFetchError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Tenant not found') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    console.error('[Product Photo QA] Error:', error);
    return NextResponse.json(
      { error: 'Photo QA is temporarily unavailable. You can continue without it.' },
      { status: 502 }
    );
  }
}
