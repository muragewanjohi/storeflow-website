/**
 * DA.26 — landlord-editable platform-wide settings.
 *
 * Currently exposes exactly one real setting: the DA.24 starter-pack
 * generic-image reuse cap (previously a hardcoded constant). Deliberately
 * a small, explicit allow-list (KNOWN_SETTINGS below) rather than a
 * generic "set any key" endpoint — this is a landlord-only route, but an
 * arbitrary-key writer is still a needless blast-radius increase for a
 * feature that currently has exactly one real, well-understood value.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireRole } from '@/lib/auth/server';
import {
  getGenericImageCacheReuseCap,
  setPlatformSetting,
  GENERIC_IMAGE_CACHE_REUSE_CAP_KEY,
  GENERIC_IMAGE_CACHE_REUSE_CAP_DEFAULT,
} from '@/lib/settings/platform-settings';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

const KNOWN_SETTINGS = [GENERIC_IMAGE_CACHE_REUSE_CAP_KEY] as const;

export async function GET() {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const [reuseCap, row] = await Promise.all([
      getGenericImageCacheReuseCap(),
      prisma.platform_settings.findUnique({ where: { key: GENERIC_IMAGE_CACHE_REUSE_CAP_KEY } }),
    ]);

    return NextResponse.json({
      genericImageCacheReuseCap: {
        value: reuseCap,
        default: GENERIC_IMAGE_CACHE_REUSE_CAP_DEFAULT,
        isOverridden: row !== null,
        updatedAt: row?.updated_at ?? null,
      },
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied. Landlord role required.' }, { status: 403 });
    }
    console.error('[Admin Platform Settings] GET error:', error);
    return NextResponse.json({ error: 'Failed to load platform settings.' }, { status: 500 });
  }
}

const putSchema = z.object({
  key: z.enum(KNOWN_SETTINGS),
  value: z.number().int().min(1).max(1000),
});

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const body = await request.json();
    const input = putSchema.parse(body);

    await setPlatformSetting({
      key: input.key,
      value: String(input.value),
      description:
        input.key === GENERIC_IMAGE_CACHE_REUSE_CAP_KEY
          ? 'How many times a niche\'s shared starter-pack homepage images (DA.24) are reused before a fresh set is generated.'
          : undefined,
      updatedBy: user.id,
    });

    return NextResponse.json({ success: true, key: input.key, value: input.value });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied. Landlord role required.' }, { status: 403 });
    }
    console.error('[Admin Platform Settings] PUT error:', error);
    return NextResponse.json({ error: 'Failed to save platform setting.' }, { status: 500 });
  }
}
