/**
 * Free-form Marketing Image Generation — AI Phase 6.1 (docs/AI_FEATURES_PLAN.md)
 *
 * A direct API entry point mirroring the exact same core the Dashboard AI
 * Assistant's 'marketing_images' configuration_guidance target uses
 * (@/lib/marketing-images/marketing-image-shared) — a merchant gets
 * identical behavior and cost whether they reach this through chat or a
 * future dedicated UI calling this route directly.
 *
 * Unlike the chat path (which always proposes-then-confirms across two
 * turns before generating, since a wrong guess costs real money), this
 * endpoint generates immediately on a single call — a direct API caller
 * has already decided to generate by calling it; there is no "propose"
 * concept at the raw-API layer, same as every other single-shot
 * generate-then-save AI route in this app (e.g. product_description).
 *
 * Generated images are saved to the tenant's real Media Library
 * (media_uploads) — never auto-applied anywhere. The caller decides where
 * to use them.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
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
  description: z.string().min(1, 'description is required').max(500),
  count: z.number().int().min(1).max(MAX_MARKETING_IMAGES_PER_BATCH).default(3),
  bucket: z.enum(['setup', 'monthly']).default('monthly'),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const body = await request.json();
    const input = requestSchema.parse(body);

    const quota = await canUseAiFeature(tenant, 'marketing_image_prompt', input.bucket);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: quota.reason ?? 'This feature is not available on your current plan.', current: quota.current, limit: quota.limit },
        { status: 403 }
      );
    }
    const remaining = typeof quota.limit === 'number' ? Math.max(0, quota.limit - (quota.current ?? 0)) : MAX_MARKETING_IMAGES_PER_BATCH;
    const count = Math.max(1, Math.min(input.count, remaining, MAX_MARKETING_IMAGES_PER_BATCH));

    const apiKey = process.env.NANO_BANANA_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Set GEMINI_API_KEY (or GOOGLE_AI_API_KEY) to enable image generation.' },
        { status: 400 }
      );
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
      return NextResponse.json({ error: "Couldn't work out a good image to generate from that description." }, { status: 400 });
    }

    const { images, failed } = await renderAndSaveMarketingImages({
      tenantId: tenant.id,
      apiKey,
      prompts: batch.prompts,
      bucket: input.bucket,
    });

    return NextResponse.json({
      summary: batch.summary,
      images: images.map((img) => ({ label: img.label, url: img.imageUrl, mediaId: img.mediaId })),
      failed,
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

    console.error('[Marketing Images Generate] Error:', error);
    return NextResponse.json(
      { error: 'Image generation is temporarily unavailable. Please try again shortly.' },
      { status: 502 }
    );
  }
}
