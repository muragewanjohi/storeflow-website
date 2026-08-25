/**
 * DA.25 — post-registration homepage images (mobile/Flutter).
 *
 * Bearer-token mirror of src/app/api/dashboard/homepage-images/route.ts.
 * Runs the EXACT same core (@/lib/homepage-images/regenerate-shared) as
 * web and the Dashboard AI Assistant's homepage_image target — nothing
 * about quota checking, image generation, or the homepage patch is
 * reimplemented or forked for mobile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { canUseAiFeature } from '@/lib/subscriptions/limits';
import {
  getHomepageImagesSnapshot,
  regenerateHomepageImage,
  isHomepageImageSlot,
  HOMEPAGE_IMAGE_SLOT_LABELS,
} from '@/lib/homepage-images/regenerate-shared';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenant } = gate.ctx;

  try {
    const [images, quota] = await Promise.all([
      getHomepageImagesSnapshot(tenant.id),
      canUseAiFeature(tenant, 'marketing_image_prompt', 'monthly'),
    ]);

    return NextResponse.json(
      mobileSuccess({
        images,
        quota: {
          allowed: quota.allowed,
          current: quota.current ?? 0,
          limit: quota.limit ?? null,
          reason: quota.allowed ? null : quota.reason ?? null,
        },
        slotLabels: HOMEPAGE_IMAGE_SLOT_LABELS,
      })
    );
  } catch (error) {
    console.error('[Mobile Homepage Images] GET error:', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to load homepage images.'), { status: 502 });
  }
}

const regenerateSchema = z.object({
  slot: z.enum(['hero', 'banner1', 'banner2', 'banner3', 'split_layout']),
});

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenant } = gate.ctx;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = regenerateSchema.safeParse(body);
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
    if (!isHomepageImageSlot(input.slot)) {
      return NextResponse.json(mobileError('VALIDATION_ERROR', 'Invalid slot.'), { status: 400 });
    }

    const quota = await canUseAiFeature(tenant, 'marketing_image_prompt', 'monthly');
    if (!quota.allowed) {
      return NextResponse.json(
        mobileError('FORBIDDEN', quota.reason ?? 'This feature is not available on your current plan.'),
        { status: 403 }
      );
    }

    const result = await regenerateHomepageImage({ tenant, slot: input.slot });
    if (!result.success) {
      return NextResponse.json(mobileError('INTERNAL_ERROR', result.error), { status: 502 });
    }

    return NextResponse.json(
      mobileSuccess({
        imageUrl: result.imageUrl,
        pagePatched: result.pagePatched,
        slot: input.slot,
      })
    );
  } catch (error) {
    console.error('[Mobile Homepage Images] POST error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Image regeneration is temporarily unavailable. Please try again shortly.'),
      { status: 502 }
    );
  }
}
