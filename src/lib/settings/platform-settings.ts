/**
 * DA.26 — platform-wide, landlord-editable key/value settings
 * (`platform_settings` table). Distinct from static-options.ts, which is
 * per-tenant — this is the first genuinely cross-tenant admin-configurable
 * store in the app.
 *
 * Deliberately generic (string value, caller parses) rather than one column
 * per setting — meant to grow beyond the one real value it starts with.
 * Every read has a real, sensible fallback default so a missing/unset row
 * (the normal state until an admin actually changes something) never
 * breaks the feature that reads it.
 */

import { prisma } from '@/lib/prisma/client';

export async function getPlatformSetting(key: string): Promise<string | null> {
  try {
    const row = await prisma.platform_settings.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch (error) {
    console.warn(`[PlatformSettings] Failed to read "${key}" (falling back to default)`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

export async function setPlatformSetting(params: {
  key: string;
  value: string;
  description?: string;
  updatedBy?: string | null;
}): Promise<void> {
  await prisma.platform_settings.upsert({
    where: { key: params.key },
    create: {
      key: params.key,
      value: params.value,
      description: params.description,
      updated_by: params.updatedBy ?? null,
    },
    update: {
      value: params.value,
      ...(params.description !== undefined ? { description: params.description } : {}),
      updated_by: params.updatedBy ?? null,
    },
  });
}

async function getPlatformSettingInt(key: string, fallback: number): Promise<number> {
  const raw = await getPlatformSetting(key);
  if (raw === null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// ---------------------------------------------------------------------------
// GENERIC_IMAGE_CACHE_REUSE_CAP (DA.24) — how many times a niche's shared
// starter-pack images get reused before regenerating fresh ones. Was a
// hardcoded constant in starter-pack/route.ts; made admin-editable directly
// per the user's request.
// ---------------------------------------------------------------------------

export const GENERIC_IMAGE_CACHE_REUSE_CAP_KEY = 'generic_image_cache_reuse_cap';
/** The value this setting shipped with (DA.24) — used whenever no admin override has ever been saved. */
export const GENERIC_IMAGE_CACHE_REUSE_CAP_DEFAULT = 8;

export async function getGenericImageCacheReuseCap(): Promise<number> {
  return getPlatformSettingInt(GENERIC_IMAGE_CACHE_REUSE_CAP_KEY, GENERIC_IMAGE_CACHE_REUSE_CAP_DEFAULT);
}
