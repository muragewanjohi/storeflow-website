/**
 * Free-form Marketing Image Generation (mobile/Flutter) — bearer-token
 * mirror of src/app/api/marketing-images/generate/route.ts.
 *
 * Runs the EXACT same batched prompt-writing + rendering core as web,
 * imported from @/lib/marketing-images/marketing-image-shared. Same
 * single-shot-generates-immediately semantics as the web route (see that
 * route's docblock for why there's no separate "propose" step here).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { canUseAiFeature } from '@/lib/subscriptions/limits';
import { getBusinessProfile } from '@/lib/tenant-context/business-profile';
import {
  writeMarketingImageBatch,
  renderAndSaveMarketingImages,
  MAX_MARKETING_IMAGES_PER_BATCH,
} from '@/lib/marketing-images/marketing-image-shared';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const requestSchema = z.object({
  description: z.string().min(1).max(500),
  count: z.number().int().min(1).max(MAX_MARKETING_IMAGES_PER_BATCH).default(3),
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

    const quota = await canUseAiFeature(tenant, 'marketing_image_prompt', 'monthly');
    if (!quota.allowed) {
      return NextResponse.json(
        mobileError('FORBIDDEN', quota.reason ?? 'This feature is not available on your current plan.'),
        { status: 403 }
      );
    }
    const remaining = typeof quota.limit === 'number' ? Math.max(0, quota.limit - (quota.current ?? 0)) : MAX_MARKETING_IMAGES_PER_BATCH;
    const count = Math.max(1, Math.min(input.count, remaining, MAX_MARKETING_IMAGES_PER_BATCH));

    const apiKey = process.env.NANO_BANANA_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(mobileError('BAD_REQUEST', 'Image generation is not configured.'), { status: 400 });
    }

    const { businessType, niche } = getBusinessProfile(tenant);
    const { data: batch } = await writeMarketingImageBatch({
      tenantId: tenant.id,
      businessType,
      niche,
      requestDescription: input.description,
      requestedCount: count,
    });

    if (batch.prompts.length === 0) {
      return NextResponse.json(
        mobileError('BAD_REQUEST', "Couldn't work out a good image to generate from that description."),
        { status: 400 }
      );
    }

    const { images, failed } = await renderAndSaveMarketingImages({
      tenantId: tenant.id,
      apiKey,
      prompts: batch.prompts,
      bucket: 'monthly',
    });

    return NextResponse.json(
      mobileSuccess({
        summary: batch.summary,
        images: images.map((img) => ({ label: img.label, url: img.imageUrl, mediaId: img.mediaId })),
        failed,
      })
    );
  } catch (error) {
    console.error('[Mobile Marketing Images Generate] Error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Image generation is temporarily unavailable. Please try again shortly.'),
      { status: 502 }
    );
  }
}
