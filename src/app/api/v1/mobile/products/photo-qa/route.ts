/**
 * Product Photo QA (mobile/Flutter) — bearer-token mirror of
 * src/app/api/products/photo-qa/route.ts.
 *
 * Runs the EXACT same vision-QA prompt/schema as web, imported from
 * @/lib/products/photo-qa-shared — nothing about the Claude vision call is
 * reimplemented or forked for mobile. Purely advisory, same as web — never
 * writes to the product record itself.
 *
 * Real differences from the web route:
 *  1. Auth: requireMobileTenantStaff() (bearer token) instead of
 *     requireAuth()+requireTenant() (cookie session).
 *  2. Response envelope: mobileSuccess()/mobileError().
 *  3. No `bucket` — mobile always guards/records against 'monthly', same
 *     reasoning as the mobile product-intake mirror (web's 'setup' bucket
 *     is for the onboarding-era entry point mobile has no equivalent of).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { estimateCostUsd } from '@/lib/ai/claude-client';
import { recordAiUsage } from '@/lib/ai/usage';
import { guardAiRequest } from '@/lib/ai/guard';
import { fetchImageAsBase64, runPhotoQa, PhotoFetchError } from '@/lib/products/photo-qa-shared';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  imageUrl: z.string().url('imageUrl must be a valid URL'),
  productName: z.string().min(1).max(255).optional(),
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

    const guard = await guardAiRequest(tenant, 'photo_qa', 'monthly');
    if (!guard.ok) {
      const guardBody = await guard.response.json().catch(() => ({ error: 'Request blocked.' }));
      const status = guard.response.status;
      const code = status === 429 ? 'RATE_LIMITED' : 'FORBIDDEN';
      return NextResponse.json(mobileError(code, guardBody.error ?? 'Request blocked.'), { status });
    }

    let imageData: Awaited<ReturnType<typeof fetchImageAsBase64>>;
    try {
      imageData = await fetchImageAsBase64(input.imageUrl);
    } catch (error) {
      if (error instanceof PhotoFetchError) {
        return NextResponse.json(mobileError('VALIDATION_ERROR', error.message), { status: 400 });
      }
      throw error;
    }

    const { data, usage } = await runPhotoQa({
      imageBase64: imageData.base64,
      imageMediaType: imageData.mediaType,
      productName: input.productName,
    });

    const estimatedCost = estimateCostUsd(usage);
    await recordAiUsage({
      tenantId: tenant.id,
      feature: 'photo_qa',
      bucket: 'monthly',
      usage,
      estimatedCost,
      itemCount: 1,
    });

    return NextResponse.json(
      mobileSuccess({
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
      })
    );
  } catch (error) {
    console.error('[Mobile Product Photo QA] Error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Photo QA is temporarily unavailable. You can continue without it.'),
      { status: 502 }
    );
  }
}
