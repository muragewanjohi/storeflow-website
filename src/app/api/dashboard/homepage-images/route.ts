/**
 * DA.25 — post-registration homepage images (web).
 *
 * GET: the tenant's real current 5 homepage image URLs (from their live
 * 'home' page) + real remaining monthly quota. Read-only, no AI call.
 * POST: regenerate exactly ONE of the 5 slots for real, via the shared core
 * (@/lib/homepage-images/regenerate-shared) — same implementation the
 * Dashboard AI Assistant's homepage_image target uses
 * (@/lib/assistant/shared), so a merchant gets identical behavior whether
 * they click the button here or ask the assistant in chat.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { canUseAiFeature } from '@/lib/subscriptions/limits';
import {
  getHomepageImagesSnapshot,
  regenerateHomepageImage,
  isHomepageImageSlot,
  HOMEPAGE_IMAGE_SLOT_LABELS,
} from '@/lib/homepage-images/regenerate-shared';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const [images, quota] = await Promise.all([
      getHomepageImagesSnapshot(tenant.id),
      canUseAiFeature(tenant, 'marketing_image_prompt', 'monthly'),
    ]);

    return NextResponse.json({
      images,
      quota: {
        allowed: quota.allowed,
        current: quota.current ?? 0,
        limit: quota.limit ?? null,
        reason: quota.allowed ? null : quota.reason ?? null,
      },
      slotLabels: HOMEPAGE_IMAGE_SLOT_LABELS,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Tenant not found') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    console.error('[Homepage Images] GET error:', error);
    return NextResponse.json({ error: 'Failed to load homepage images.' }, { status: 500 });
  }
}

const regenerateSchema = z.object({
  slot: z.enum(['hero', 'banner1', 'banner2', 'banner3', 'split_layout']),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const body = await request.json();
    const input = regenerateSchema.parse(body);
    if (!isHomepageImageSlot(input.slot)) {
      return NextResponse.json({ error: 'Invalid slot.' }, { status: 400 });
    }

    const quota = await canUseAiFeature(tenant, 'marketing_image_prompt', 'monthly');
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: quota.reason ?? 'This feature is not available on your current plan.',
          current: quota.current,
          limit: quota.limit,
        },
        { status: 403 }
      );
    }

    const result = await regenerateHomepageImage({ tenant, slot: input.slot });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      imageUrl: result.imageUrl,
      pagePatched: result.pagePatched,
      slot: input.slot,
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
    console.error('[Homepage Images] POST error:', error);
    return NextResponse.json(
      { error: 'Image regeneration is temporarily unavailable. Please try again shortly.' },
      { status: 502 }
    );
  }
}
