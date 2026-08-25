/**
 * DA.25 — post-registration "regenerate one of my 5 homepage images" core.
 *
 * Shared by the web route (src/app/api/dashboard/homepage-images/route.ts),
 * the mobile mirror (src/app/api/v1/mobile/dashboard/homepage-images/route.ts),
 * and the Dashboard AI Assistant's homepage_image configuration_guidance
 * target (@/lib/assistant/shared) — one tested implementation, not three
 * copies, same discipline as every other dual-platform AI feature this
 * session.
 *
 * Real distinctions from the registration-time 5-image generation
 * (@/lib/onboarding/nano-banana-jobs, DA.21/23/24):
 *  - Billed under the 'marketing_image_prompt' AiFeature / 'monthly' bucket
 *    (the quota AI_FEATURES_PLAN.md already reserved for merchant-triggered
 *    marketing images), NOT 'starter_pack_image'/'setup' — a merchant
 *    clicking "regenerate" later is a genuinely different, ongoing-cost
 *    feature from the one-time automatic registration images.
 *  - Never touches onboarding_generic_image_cache (DA.24's shared reuse
 *    cache) — that cache exists so NEW registrations in a popular niche can
 *    skip paying for a fresh generation; a merchant deliberately regenerating
 *    THEIR OWN store's image is a per-tenant customization and must never
 *    silently change what future signups in that niche get.
 *  - Patches the tenant's own already-saved `pages` row directly (the
 *    homepage already exists by the time this runs), via
 *    applySingleHomepageImageToPageBuilderData() — narrower than the
 *    registration-time patch, which touches all 5 slots at once.
 */

import { prisma } from '@/lib/prisma/client';
import type { Tenant } from '@/lib/tenant-context';
import { getBusinessProfile } from '@/lib/tenant-context/business-profile';
import {
  buildSingleHomepageImageJob,
  executeNanoBananaJobs,
  GENERIC_IMAGE_SLOTS,
  isGenericImageSlot,
  type GenericImageSlot,
} from '@/lib/onboarding/nano-banana-jobs';
import { applySingleHomepageImageToPageBuilderData } from '@/lib/themes/homepage-templates';

export { GENERIC_IMAGE_SLOTS as HOMEPAGE_IMAGE_SLOTS, isGenericImageSlot as isHomepageImageSlot };
export type HomepageImageSlot = GenericImageSlot;

// Reads naturally both as a UI label ("New Arrivals banner") and lowercased
// mid-sentence in a chat reply ("regenerate your new arrivals banner?").
export const HOMEPAGE_IMAGE_SLOT_LABELS: Record<HomepageImageSlot, string> = {
  hero: 'Hero image',
  banner1: 'New Arrivals banner',
  banner2: 'Best Sellers banner',
  banner3: 'Special Offers banner',
  split_layout: 'Split-layout image',
};

export interface HomepageImagesSnapshot {
  hero: string | null;
  banner1: string | null;
  banner2: string | null;
  banner3: string | null;
  splitLayout: string | null;
  /** False when the tenant has no 'home' page, or it has no page-builder sections yet (e.g. a very old/manually-built page) — the regenerate feature still works even then, it just can't show a "current image" preview. */
  homepageFound: boolean;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads the tenant's real, currently-saved homepage image URLs — for the
 * "here's what you have now" display before a merchant decides to
 * regenerate. Read-only, no AI call.
 */
export async function getHomepageImagesSnapshot(tenantId: string): Promise<HomepageImagesSnapshot> {
  const empty: HomepageImagesSnapshot = {
    hero: null,
    banner1: null,
    banner2: null,
    banner3: null,
    splitLayout: null,
    homepageFound: false,
  };

  const homePage = await prisma.pages.findFirst({
    where: { tenant_id: tenantId, slug: 'home' },
    select: { content: true },
  });
  if (!homePage?.content) return empty;

  let parsed: { sections?: Array<Record<string, unknown>> };
  try {
    parsed = JSON.parse(homePage.content);
  } catch {
    return empty;
  }
  if (!Array.isArray(parsed.sections)) return empty;

  const result: HomepageImagesSnapshot = { ...empty, homepageFound: true };
  for (const section of parsed.sections) {
    if (section.type === 'hero' && typeof section.image === 'string') {
      result.hero = section.image;
    }
    if (section.type === 'banners' && Array.isArray(section.banners)) {
      const banners = section.banners as Array<Record<string, unknown>>;
      if (typeof banners[0]?.image === 'string') result.banner1 = banners[0].image as string;
      if (typeof banners[1]?.image === 'string') result.banner2 = banners[1].image as string;
      if (typeof banners[2]?.image === 'string') result.banner3 = banners[2].image as string;
    }
    if (section.type === 'split_layout' && isPlainRecord(section.left_side) && typeof section.left_side.image === 'string') {
      result.splitLayout = section.left_side.image;
    }
  }
  return result;
}

/**
 * Resolves the tenant's real currently-active theme slug via tenant_themes
 * (is_active:true) -> themes, the same authoritative source
 * GET /api/themes/current uses — not tenant.theme_slug, which isn't
 * confirmed to be kept in sync with the real active theme row.
 */
async function resolveActiveThemeSlug(tenantId: string): Promise<string> {
  const tenantTheme = await prisma.tenant_themes.findFirst({
    where: { tenant_id: tenantId, is_active: true },
    select: { theme_id: true },
  });
  if (!tenantTheme) return 'default';
  const theme = await prisma.themes.findUnique({
    where: { id: tenantTheme.theme_id },
    select: { slug: true },
  });
  return theme?.slug || 'default';
}

export type RegenerateHomepageImageResult =
  | { success: true; imageUrl: string; pagePatched: boolean; costUsd: number }
  | { success: false; error: string };

/**
 * Generates ONE new image for the given slot and patches it into the
 * tenant's own live homepage. Real Gemini cost is billed and recorded
 * ('marketing_image_prompt'/'monthly') regardless of whether the page patch
 * itself succeeds (matches the registration-time pipeline's own "cost is
 * real the moment generation happens" precedent) — pagePatched:false means
 * generation genuinely succeeded and the merchant HAS a new real image URL,
 * it just didn't land on the live homepage automatically (e.g. no 'home'
 * page row, or that section doesn't exist there yet); callers should still
 * treat this as a real success, just with a caveat to surface.
 */
export async function regenerateHomepageImage(params: {
  tenant: Tenant;
  slot: HomepageImageSlot;
}): Promise<RegenerateHomepageImageResult> {
  const { tenant, slot } = params;

  const apiKey = process.env.NANO_BANANA_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'Image generation is not configured (missing Gemini API key).' };
  }

  const { businessType, niche } = getBusinessProfile(tenant);
  const themeSlug = await resolveActiveThemeSlug(tenant.id);

  const job = buildSingleHomepageImageJob(slot, businessType || 'General retail', niche || undefined);
  const execution = await executeNanoBananaJobs({
    apiKey,
    jobs: [job],
    tenantId: tenant.id,
    feature: 'marketing_image_prompt',
    bucket: 'monthly',
  });

  const result = execution.results[0];
  const costUsd = result?.imageCostUsd ?? 0;
  if (!result?.success || !result.imageUrl) {
    return { success: false, error: result?.error || 'Image generation failed.' };
  }

  let pagePatched = false;
  try {
    const homePage = await prisma.pages.findFirst({
      where: { tenant_id: tenant.id, slug: 'home' },
      select: { id: true, content: true },
    });
    if (homePage?.content) {
      const pageBuilderData = JSON.parse(homePage.content) as { sections?: Array<Record<string, unknown>> };
      const updated = applySingleHomepageImageToPageBuilderData(pageBuilderData, slot, result.imageUrl);
      await prisma.pages.update({
        where: { id: homePage.id },
        data: { content: JSON.stringify(updated) },
      });
      pagePatched = true;
    }
  } catch (error) {
    console.warn('[HomepageImages][Trace] Regenerated image but failed to patch the live homepage page (non-fatal — real image + cost still stand)', {
      tenantId: tenant.id,
      slot,
      themeSlug,
      error: error instanceof Error ? error.message : 'Unknown patch error',
    });
  }

  return { success: true, imageUrl: result.imageUrl, pagePatched, costUsd };
}
