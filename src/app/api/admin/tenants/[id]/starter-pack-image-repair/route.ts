import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { verifyCronJobAuth } from '@/lib/cron-jobs/auth';
import { prisma } from '@/lib/prisma/client';
import { isOnboardingPlaceholderUrl } from '@/lib/onboarding/image-placeholder';
import { applyGenericImagesToPageBuilderData, isKnownStockHomepageImageUrl } from '@/lib/themes/homepage-templates';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  dryRun: z.boolean().default(false),
});

/**
 * Allow either a signed-in landlord OR a valid cron request to repair images.
 * The retry cron (`/api/admin/onboarding/image-retry`) reuses this endpoint,
 * so it needs a non-session auth path.
 */
async function authorizeRepair(request: NextRequest): Promise<
  | { ok: true; actor: 'landlord' | 'cron' }
  | { ok: false; status: number; message: string }
> {
  const cronAuth = verifyCronJobAuth(request);
  if (cronAuth.authorized) {
    return { ok: true, actor: 'cron' };
  }
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');
    return { ok: true, actor: 'landlord' };
  } catch {
    return {
      ok: false,
      status: 401,
      message: 'Unauthorized: requires landlord session or valid CRON_SECRET',
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRepair(request);
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: auth.message } },
        { status: auth.status }
      );
    }

    const { id: tenantId } = await params;
    const body = await request.json().catch(() => ({}));
    const input = requestSchema.parse(body);

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        data: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tenant not found',
          },
        },
        { status: 404 }
      );
    }

    const tenantData = isRecord(tenant.data) ? tenant.data : {};
    const existingStarterPack = isRecord(tenantData.onboarding_starter_pack)
      ? tenantData.onboarding_starter_pack
      : {};

    const products = await prisma.products.findMany({
      where: {
        tenant_id: tenantId,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        image: true,
        metadata: true,
        category_id: true,
      },
      orderBy: { created_at: 'desc' },
      take: 40,
    });

    const sales = await prisma.sales.findMany({
      where: {
        tenant_id: tenantId,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        banner_image: true,
        metadata: true,
      },
      orderBy: { created_at: 'desc' },
      take: 4,
    });

    // DA.21 registrations create zero demo products/sales — the
    // product/sale-driven repair below (and the `starter-pack` generation
    // call it makes) is a no-op for every such tenant. The 5 generic
    // homepage images (hero/3 banners/split-layout) need their own
    // detection + repair path, independent of products/sales existing.
    const homePageForGenericCheck = await prisma.pages.findFirst({
      where: { tenant_id: tenantId, slug: 'home' },
      select: { id: true, content: true },
    });

    function homepageImageNeedsGeneration(url: unknown): boolean {
      if (typeof url !== 'string' || url.trim().length === 0) return true;
      const trimmed = url.trim();
      return isOnboardingPlaceholderUrl(trimmed) || isKnownStockHomepageImageUrl(trimmed);
    }

    function homepageStillHasGenericImages(content: string | null | undefined): boolean {
      if (!content) return false;
      try {
        const parsed = JSON.parse(content) as { sections?: Array<Record<string, unknown>> };
        if (!Array.isArray(parsed.sections)) return false;
        return parsed.sections.some((section) => {
          if (section.type === 'hero') return homepageImageNeedsGeneration(section.image);
          if (section.type === 'banners' && Array.isArray(section.banners)) {
            return (section.banners as Array<Record<string, unknown>>).some((banner) =>
              homepageImageNeedsGeneration(banner.image)
            );
          }
          if (section.type === 'split_layout' && isRecord(section.left_side)) {
            return homepageImageNeedsGeneration(section.left_side.image);
          }
          return false;
        });
      } catch {
        return false;
      }
    }

    const homepageGenericImagesMarker = isRecord(tenantData.homepage_generic_images)
      ? tenantData.homepage_generic_images
      : null;
    const homepageGenericImagesMarkerStatus =
      typeof homepageGenericImagesMarker?.status === 'string' ? homepageGenericImagesMarker.status : null;
    // Explicit 'failed' always retries. Otherwise (no marker yet — an older
    // tenant registered before this marker existed, or a non-'generic-demo'
    // registration path) fall back to inspecting the actual homepage content.
    // Never re-touches a homepage already marked 'succeeded'.
    const needsGenericHomepageImages =
      homepageGenericImagesMarkerStatus === 'failed' ||
      (homepageGenericImagesMarkerStatus !== 'succeeded' &&
        homepageStillHasGenericImages(homePageForGenericCheck?.content));

    // A product/sale "needs images" if it has no image at all OR if its
    // current image is the onboarding placeholder SVG (meaning Nano Banana
    // never filled it in). Either way we only bother if there is an image
    // prompt we can feed back to Gemini.
    const productsNeedingImages = products.filter((product) => {
      const image = typeof product.image === 'string' ? product.image.trim() : '';
      const hasRealImage = image.length > 0 && !isOnboardingPlaceholderUrl(image);
      const metadata = isRecord(product.metadata) ? product.metadata : {};
      const prompt = toStringValue(metadata.generated_image_prompt);
      return !hasRealImage && prompt.length > 0;
    });

    const salesNeedingImages = sales.filter((sale) => {
      const banner = typeof sale.banner_image === 'string' ? sale.banner_image.trim() : '';
      const hasRealImage = banner.length > 0 && !isOnboardingPlaceholderUrl(banner);
      const metadata = isRecord(sale.metadata) ? sale.metadata : {};
      const prompt = toStringValue(metadata.image_prompt);
      return !hasRealImage && prompt.length > 0;
    });

    // Even when products/sales are fully populated, blogs and the homepage
    // page_builder JSON (hero, banners, split_layout) can still be stuck on
    // the onboarding placeholder. So we do NOT early-return when just
    // products/sales look healthy — we only early-return in dry-run mode
    // below after reporting what's missing.

    const categoriesRaw = Array.isArray(existingStarterPack.categories)
      ? existingStarterPack.categories.filter((item): item is string => typeof item === 'string')
      : [];

    const salesPromotionsFromTenant: unknown[] = Array.isArray(existingStarterPack.salesPromotions)
      ? existingStarterPack.salesPromotions
      : [];
    const salesPromotionByName = new Map<string, Record<string, unknown>>();
    for (const item of salesPromotionsFromTenant) {
      if (!isRecord(item)) continue;
      const titleKey = toStringValue(item.title).toLowerCase();
      if (!titleKey) continue;
      salesPromotionByName.set(titleKey, item);
    }

    // When we forward existing product/sale image URLs to the starter-pack
    // endpoint, the zod schema requires them to be absolute URLs. Root-
    // relative paths (like the onboarding placeholder SVG) and any other
    // invalid URL must be stripped so Gemini knows those images need to be
    // regenerated.
    const toAbsoluteImageUrl = (value: string | null | undefined): string | undefined => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      if (trimmed.length === 0) return undefined;
      if (isOnboardingPlaceholderUrl(trimmed)) return undefined;
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
        return trimmed;
      } catch {
        return undefined;
      }
    };

    const geminiResult = {
      copy: isRecord(existingStarterPack.copy) ? existingStarterPack.copy : undefined,
      themeConfig: isRecord(existingStarterPack.themeConfig) ? existingStarterPack.themeConfig : undefined,
      categories: categoriesRaw,
      demoProducts: products.map((product) => {
        const metadata = isRecord(product.metadata) ? product.metadata : {};
        const prompt = toStringValue(metadata.generated_image_prompt);
        return {
          name: product.name,
          priceKES: 1000,
          description: `${product.name} starter-pack product`,
          imagePrompt: prompt || undefined,
          nanoBananaPrompt: prompt || undefined,
          imageUrl: toAbsoluteImageUrl(product.image),
        };
      }),
      salesPromotions: sales.map((sale) => {
        const metadata = isRecord(sale.metadata) ? sale.metadata : {};
        const prompt = toStringValue(metadata.image_prompt);
        const existingPromotion = salesPromotionByName.get(sale.name.toLowerCase());
        const subtitle = existingPromotion ? toStringValue(existingPromotion.subtitle) : '';
        const ctaText = existingPromotion ? toStringValue(existingPromotion.ctaText) : '';
        return {
          title: sale.name,
          subtitle: subtitle || `${sale.name} promotion`,
          ctaText: ctaText || 'Shop Now',
          imagePrompt: prompt || undefined,
          nanoBananaPrompt: prompt || undefined,
          imageUrl: toAbsoluteImageUrl(sale.banner_image),
        };
      }),
      blogPosts: [],
    };

    if (input.dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          tenantId,
          dryRun: true,
          repaired: false,
          productsMissingWithPrompt: productsNeedingImages.length,
          salesMissingWithPrompt: salesNeedingImages.length,
          needsGenericHomepageImages,
          generationCandidates: {
            products: productsNeedingImages.map((item) => item.name),
            sales: salesNeedingImages.map((item) => item.name),
          },
        },
      });
    }

    // DA.21 — repair the 5 generic homepage images (hero/3 banners/split-
    // layout) independently of the products/sales-driven path below, which
    // is a no-op for every tenant registered without demo products (i.e.
    // effectively every tenant today). Reuses the exact same endpoint/cache/
    // niche-grounding logic registration itself calls
    // (POST /api/onboarding/starter-pack with genericImagesOnly:true), just
    // re-triggered here for a tenant whose first attempt failed or was never
    // marked complete.
    let genericHomepageImagesRepaired = false;
    let genericHomepageImagesError: string | null = null;
    if (needsGenericHomepageImages) {
      try {
        const businessTypeForImages = toStringValue(tenantData.business_type) || 'General';
        const nicheForImages =
          toStringValue(tenantData.niche) || toStringValue(tenantData.selling) || undefined;

        const genericRes = await fetch(`${request.nextUrl.origin}/api/onboarding/starter-pack`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessType: businessTypeForImages,
            niche: nicheForImages,
            tenantId,
            genericImagesOnly: true,
          }),
        });
        const genericBody = await genericRes.json().catch(() => ({}));
        const images = genericBody?.data?.genericImages as
          | { hero: string | null; banners: string[]; splitLayout: string | null }
          | undefined;

        if (genericRes.ok && genericBody?.success && images && (images.hero || images.banners.length > 0 || images.splitLayout)) {
          if (homePageForGenericCheck?.content) {
            const pageBuilderData = JSON.parse(homePageForGenericCheck.content) as {
              sections?: Array<Record<string, unknown>>;
            };
            const updated = applyGenericImagesToPageBuilderData(pageBuilderData, images);
            await prisma.pages.update({
              where: { id: homePageForGenericCheck.id },
              data: { content: JSON.stringify(updated) },
            });
            genericHomepageImagesRepaired = true;
          } else {
            genericHomepageImagesError = 'Homepage row had no content to patch';
          }
        } else {
          genericHomepageImagesError =
            genericBody?.error?.message || `Generic image generation failed (HTTP ${genericRes.status})`;
        }
      } catch (error) {
        genericHomepageImagesError =
          error instanceof Error ? error.message : 'Unknown generic homepage image repair error';
      }

      console.log('[StarterPackImageRepair] Generic homepage images repair attempt', {
        tenantId,
        repaired: genericHomepageImagesRepaired,
        error: genericHomepageImagesError,
      });
    }

    // Only hit the starter-pack / Nano Banana endpoint if there's actually
    // something to generate. Blog/homepage repairs below can still run using
    // the pool of real URLs already on the products/sales rows.
    const shouldRunGeneration =
      productsNeedingImages.length > 0 || salesNeedingImages.length > 0;

    let generatedProducts: unknown[] = [];
    let generatedPromotions: unknown[] = [];
    let starterPackSource: unknown = null;

    if (shouldRunGeneration) {
      const generationResponse = await fetch(`${request.nextUrl.origin}/api/onboarding/starter-pack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessType: toStringValue(tenantData.business_type) || 'General',
          selling: toStringValue(tenantData.selling) || 'General',
          tenantId,
          variationSeed: tenantId,
          locale: 'en-KE',
          currency: 'KES',
          productsCount: Math.max(products.length, 1),
          categoriesCount: Math.max(categoriesRaw.length, 1),
          blogPostsCount: 1,
          includeGeminiCall: false,
          includeNanoBananaCall: true,
          checkSellingExists: false,
          forceExternalGeneration: false,
          geminiResult,
        }),
      });

      const generationPayload = await generationResponse.json();
      if (!generationResponse.ok || !generationPayload?.success) {
        const baseMessage =
          generationPayload?.error?.message || 'Failed to generate missing starter-pack images';
        const detailSummary = Array.isArray(generationPayload?.error?.details)
          ? generationPayload.error.details
              .slice(0, 5)
              .map((issue: any) => {
                const path = Array.isArray(issue?.path) ? issue.path.join('.') : '';
                return `${path || '<root>'}: ${issue?.message || 'invalid'}`;
              })
              .join('; ')
          : null;
        console.error('[StarterPackImageRepair] Starter-pack generation failed', {
          tenantId,
          status: generationResponse.status,
          errorCode: generationPayload?.error?.code,
          errorMessage: baseMessage,
          details: generationPayload?.error?.details,
        });
        throw new Error(detailSummary ? `${baseMessage} — ${detailSummary}` : baseMessage);
      }

      const generatedPack = generationPayload?.data?.gemini?.generatedStarterPack;
      if (!isRecord(generatedPack)) {
        throw new Error('Image generation returned invalid starter pack payload');
      }

      generatedProducts = Array.isArray(generatedPack.demoProducts)
        ? generatedPack.demoProducts
        : [];
      generatedPromotions = Array.isArray(generatedPack.salesPromotions)
        ? generatedPack.salesPromotions
        : [];
      starterPackSource = generationPayload?.data?.starterPackSource ?? null;
    }

    const productImageByName = new Map<string, string>();
    for (const item of generatedProducts) {
      if (!isRecord(item)) continue;
      const key = toStringValue(item.name).toLowerCase();
      const imageUrl = toStringValue(item.imageUrl);
      if (!key || !imageUrl) continue;
      productImageByName.set(key, imageUrl);
    }

    const saleImageByName = new Map<string, string>();
    for (const item of generatedPromotions) {
      if (!isRecord(item)) continue;
      const key = toStringValue(item.title).toLowerCase();
      const imageUrl = toStringValue(item.imageUrl);
      if (!key || !imageUrl) continue;
      saleImageByName.set(key, imageUrl);
    }

    let productsUpdated = 0;
    let salesUpdated = 0;
    let categoriesUpdated = 0;
    let blogsUpdated = 0;
    const categoryImageCandidates = new Map<string, string>();
    // Combined pool of real (absolute, non-placeholder) image URLs we can
    // reuse for blogs and homepage sections: anything we just generated OR
    // any real URL already on a product/sale row in the DB.
    const imagePool: string[] = [];
    const pushToPool = (url: string | null | undefined): void => {
      if (typeof url !== 'string') return;
      const trimmed = url.trim();
      if (trimmed.length === 0) return;
      if (isOnboardingPlaceholderUrl(trimmed)) return;
      if (imagePool.includes(trimmed)) return;
      imagePool.push(trimmed);
    };

    for (const product of productsNeedingImages) {
      const generatedImage = productImageByName.get(product.name.toLowerCase());
      if (!generatedImage) continue;
      await prisma.products.update({
        where: { id: product.id },
        data: { image: generatedImage },
      });
      productsUpdated += 1;
      pushToPool(generatedImage);
      if (product.category_id && !categoryImageCandidates.has(product.category_id)) {
        categoryImageCandidates.set(product.category_id, generatedImage);
      }
    }

    for (const [categoryId, imageUrl] of categoryImageCandidates.entries()) {
      await prisma.categories.update({
        where: { id: categoryId },
        data: { image: imageUrl },
      });
      categoriesUpdated += 1;
    }

    for (const sale of salesNeedingImages) {
      const generatedImage = saleImageByName.get(sale.name.toLowerCase());
      if (!generatedImage) continue;
      await prisma.sales.update({
        where: { id: sale.id },
        data: { banner_image: generatedImage },
      });
      salesUpdated += 1;
      pushToPool(generatedImage);
    }

    for (const product of products) pushToPool(product.image);
    for (const sale of sales) pushToPool(sale.banner_image);

    if (imagePool.length > 0) {
      const blogsMissingImages = await prisma.blogs.findMany({
        where: {
          tenant_id: tenantId,
          OR: [
            { image: null },
            { image: '' },
            { image: { contains: 'onboarding-product-placeholder', mode: 'insensitive' } },
          ],
        },
        select: { id: true, image: true },
        take: 6,
        orderBy: { created_at: 'desc' },
      });

      for (let index = 0; index < blogsMissingImages.length; index += 1) {
        const blog = blogsMissingImages[index];
        const current = typeof blog.image === 'string' ? blog.image.trim() : '';
        if (current.length > 0 && !isOnboardingPlaceholderUrl(current)) continue;
        const imageUrl = imagePool[index % imagePool.length];
        await prisma.blogs.update({
          where: { id: blog.id },
          data: { image: imageUrl },
        });
        blogsUpdated += 1;
      }
    }

    // The homepage's page_builder content JSON was seeded at registration
    // time (when no AI images existed yet) with the onboarding placeholder
    // URL baked into `hero.image`, `banners[i].image`, and
    // `split_layout.left_side.image`. Updating the products/sales tables
    // alone leaves those placeholders on the rendered home page, so we now
    // re-stamp those slots using the freshly generated image pool.
    let homepageSectionsUpdated = 0;
    if (imagePool.length > 0) {
      const homePage = await prisma.pages.findFirst({
        where: { tenant_id: tenantId, slug: 'home' },
        select: { id: true, content: true },
      });

      if (homePage?.content) {
        try {
          const pageBuilderData = JSON.parse(homePage.content) as {
            sections?: Array<Record<string, unknown>>;
          };

          if (Array.isArray(pageBuilderData.sections)) {
            const pickRealUrl = (value: string | null | undefined): string | undefined => {
              if (typeof value !== 'string') return undefined;
              const trimmed = value.trim();
              if (trimmed.length === 0) return undefined;
              if (isOnboardingPlaceholderUrl(trimmed)) return undefined;
              return trimmed;
            };
            const firstPromoImage =
              sales
                .map((s) => saleImageByName.get(s.name.toLowerCase()))
                .find((url): url is string => typeof url === 'string' && url.length > 0) ||
              sales.map((s) => pickRealUrl(s.banner_image)).find((u): u is string => !!u);
            const firstProductImage =
              products
                .map((p) => productImageByName.get(p.name.toLowerCase()))
                .find((url): url is string => typeof url === 'string' && url.length > 0) ||
              products.map((p) => pickRealUrl(p.image)).find((u): u is string => !!u);
            const bestStarterPackImage =
              firstPromoImage || firstProductImage || imagePool[0];

            const shouldReplace = (current: unknown): boolean => {
              if (typeof current !== 'string') return true;
              const trimmed = current.trim();
              if (trimmed.length === 0) return true;
              return isOnboardingPlaceholderUrl(trimmed);
            };

            const updatedSections = pageBuilderData.sections.map((section) => {
              if (section.type === 'hero' && bestStarterPackImage && shouldReplace(section.image)) {
                homepageSectionsUpdated += 1;
                return { ...section, image: bestStarterPackImage };
              }

              if (
                section.type === 'banners' &&
                Array.isArray(section.banners) &&
                section.banners.length > 0
              ) {
                const existingBanners = section.banners as Array<Record<string, unknown>>;
                let bannersTouched = false;
                const nextBanners = existingBanners.map((banner, i) => {
                  if (!shouldReplace(banner.image)) return banner;
                  const generated = generatedPromotions[i];
                  const fromPromo =
                    isRecord(generated) && typeof generated.imageUrl === 'string'
                      ? generated.imageUrl.trim()
                      : '';
                  const fallback = imagePool[i % imagePool.length];
                  const chosen = fromPromo || fallback;
                  if (!chosen) return banner;
                  bannersTouched = true;
                  return { ...banner, image: chosen };
                });
                if (bannersTouched) {
                  homepageSectionsUpdated += 1;
                  return { ...section, banners: nextBanners };
                }
                return section;
              }

              if (
                section.type === 'split_layout' &&
                bestStarterPackImage &&
                isRecord(section.left_side) &&
                shouldReplace(section.left_side.image)
              ) {
                homepageSectionsUpdated += 1;
                return {
                  ...section,
                  left_side: { ...section.left_side, image: bestStarterPackImage },
                };
              }

              return section;
            });

            if (homepageSectionsUpdated > 0) {
              await prisma.pages.update({
                where: { id: homePage.id },
                data: {
                  content: JSON.stringify({
                    ...pageBuilderData,
                    sections: updatedSections,
                  }),
                },
              });
            }
          }
        } catch (error) {
          console.warn('[StarterPackImageRepair] Failed to refresh homepage sections', {
            tenantId,
            error: error instanceof Error ? error.message : 'unknown',
          });
        }
      }
    }

    const anyImagesUpdated =
      productsUpdated > 0 ||
      salesUpdated > 0 ||
      blogsUpdated > 0 ||
      homepageSectionsUpdated > 0 ||
      genericHomepageImagesRepaired;
    const priorOnboardingSetup = isRecord(tenantData.onboarding_setup)
      ? tenantData.onboarding_setup
      : {};
    const updatedTenantData = {
      ...tenantData,
      ...(needsGenericHomepageImages
        ? {
            homepage_generic_images: {
              status: genericHomepageImagesRepaired ? 'succeeded' : 'failed',
              error: genericHomepageImagesError,
              attemptedAt: new Date().toISOString(),
              repairedBy: auth.actor,
            },
          }
        : {}),
      onboarding_starter_pack: {
        ...(isRecord(existingStarterPack) ? existingStarterPack : {}),
        salesPromotions: generatedPromotions as Prisma.JsonValue,
        productImages: generatedProducts
          .map((item) =>
            isRecord(item)
              ? {
                  name: toStringValue(item.name),
                  imageUrl: toStringValue(item.imageUrl),
                }
              : null
          )
          .filter((item) => Boolean(item)),
        images_repaired_at: new Date().toISOString(),
      },
      onboarding_setup: anyImagesUpdated
        ? {
            ...priorOnboardingSetup,
            status: 'completed',
            stage: 'images',
            completedAt: new Date().toISOString(),
            repairedBy: auth.actor,
          }
        : priorOnboardingSetup,
    };

    await prisma.tenants.update({
      where: { id: tenantId },
      data: {
        data: updatedTenantData as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        tenantId,
        repaired: true,
        productsMissingWithPrompt: productsNeedingImages.length,
        salesMissingWithPrompt: salesNeedingImages.length,
        productsUpdated,
        salesUpdated,
        categoriesUpdated,
        blogsUpdated,
        homepageSectionsUpdated,
        starterPackSource,
        needsGenericHomepageImages,
        genericHomepageImagesRepaired,
        genericHomepageImagesError,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid repair request payload',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to repair starter-pack images',
        },
      },
      { status: 500 }
    );
  }
}

