/**
 * Public Tenant Registration API Route
 * 
 * POST /api/tenants/register
 * 
 * Allows public users to register a new tenant (no auth required)
 *
 * New tenants get a clean catalog (no demo products, categories, sales, or blogs from this route).
 */

import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@prisma/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateSubdomain } from '@/lib/subdomain-validation';
import { sendEmail } from '@/lib/email/sendgrid';
import {
  detectUserLocation,
  getPricingInfoForCountry,
  resolvePlanMonthlyPrice,
  resolveTenantBillingCountry,
} from '@/lib/pricing/location';
import { getDefaultRegistrationPlan } from '@/lib/subscriptions/load-plans';
import { getCurrencyForCountry } from '@/lib/pricing/country-currency-map';
import { setStaticOptions } from '@/lib/settings/static-options';
import { addTenantDomain } from '@/lib/vercel-domains';
import { clearCachedTenant } from '@/lib/tenant-context/cache';
import { z } from 'zod';
import {
  getHomepageLayout,
  convertLegacyLayoutToPageBuilder,
  createDefaultHomepageTemplate,
  applyGenericImagesToPageBuilderData,
} from '@/lib/themes/homepage-templates';
import { getThemeDefaults } from '@/lib/themes/theme-defaults';
import { getAdditionalPageTemplates } from '@/lib/themes/additional-pages';
import { createDemoAttributes, createDemoContent } from '@/lib/themes/demo-content';
import {
  getOnboardingImagePlaceholderUrl,
  isOnboardingPlaceholderUrl,
} from '@/lib/onboarding/image-placeholder';
import { persistHomepageInstallSnapshot } from '@/lib/onboarding/onboarding-reward';
import { generateSlug } from '@/lib/content/validation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { isKnownCountryCode, parseToE164Digits, type CountryCode } from '@/lib/phone/parse';
import { generateSaleSlug, sanitizeSaleName } from '@/lib/sales/validation';
import { buildDemoProductMetadata } from '@/lib/products/demo-products';
import { queueTumiziProvisioningForTenant } from '@/lib/tumizi/provisioning';
import { createTenantReferralAttribution } from '@/lib/referrals/service';

interface StarterPackProduct {
  name: string;
  priceKES: number;
  description: string;
  imagePrompt?: string;
  nanoBananaPrompt?: string;
  imageUrl?: string;
}

interface StarterPackSalesPromotion {
  title: string;
  subtitle: string;
  ctaText?: string;
  imagePrompt?: string;
  imageUrl?: string;
}

interface StarterPackBlogPost {
  title: string;
  summary?: string;
}

interface StarterPackPayload {
  copy?: {
    headline?: string;
    subheadline?: string;
    ctaText?: string;
  };
  themeConfig?: Record<string, { hex: string; description?: string }>;
  categories?: string[];
  demoProducts?: StarterPackProduct[];
  salesPromotions?: StarterPackSalesPromotion[];
  blogPosts?: StarterPackBlogPost[];
}

type OnboardingImageRepairResult =
  | {
      success: true;
      data: Record<string, unknown>;
    }
  | {
      success: false;
      status?: number;
      error: string;
    };

function toTitleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

async function triggerOnboardingImageRepair(params: {
  origin: string;
  tenantId: string;
  traceId: string;
  reason: string;
}): Promise<OnboardingImageRepairResult> {
  const cronToken = process.env.CRON_SECRET || process.env.CRON_SECRET_TOKEN || '';
  if (!cronToken) {
    console.warn('[Registration][ImageRepair] Skipping repair trigger: missing CRON_SECRET', {
      traceId: params.traceId,
      tenantId: params.tenantId,
      reason: params.reason,
    });
    return {
      success: false,
      error: 'Missing CRON_SECRET for image repair trigger',
    };
  }

  try {
    const repairResponse = await fetch(
      `${params.origin}/api/admin/tenants/${params.tenantId}/starter-pack-image-repair`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cronToken}`,
          'x-vercel-cron': '1',
        },
        body: JSON.stringify({ dryRun: false }),
      }
    );

    const repairPayload = await repairResponse.json().catch(() => ({}));
    const repairData = isRecord(repairPayload?.data) ? repairPayload.data : {};
    if (!repairResponse.ok || !repairPayload?.success) {
      const errorMessage = repairPayload?.error?.message || 'Unknown repair trigger error';
      console.warn('[Registration][ImageRepair] Repair trigger failed', {
        traceId: params.traceId,
        tenantId: params.tenantId,
        reason: params.reason,
        status: repairResponse.status,
        error: errorMessage,
      });
      return {
        success: false,
        status: repairResponse.status,
        error: errorMessage,
      };
    }

    console.log('[Registration][ImageRepair] Repair trigger completed', {
      traceId: params.traceId,
      tenantId: params.tenantId,
      reason: params.reason,
      productsUpdated: Number(repairData.productsUpdated ?? 0),
      salesUpdated: Number(repairData.salesUpdated ?? 0),
      blogsUpdated: Number(repairData.blogsUpdated ?? 0),
      homepageSectionsUpdated: Number(repairData.homepageSectionsUpdated ?? 0),
    });

    return {
      success: true,
      data: repairData,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown repair trigger exception';
    console.warn('[Registration][ImageRepair] Repair trigger exception', {
      traceId: params.traceId,
      tenantId: params.tenantId,
      reason: params.reason,
      error: errorMessage,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

function starterPackNeedsImageEnrichment(starterPack: StarterPackPayload): boolean {
  const isMissingOrPlaceholder = (value: string | undefined): boolean => {
    const imageUrl = typeof value === 'string' ? value.trim() : '';
    return imageUrl.length === 0 || isOnboardingPlaceholderUrl(imageUrl);
  };

  return Boolean(
    (starterPack.demoProducts ?? []).some(
      (item) =>
        isMissingOrPlaceholder(item.imageUrl) &&
        Boolean(item.imagePrompt || item.nanoBananaPrompt)
    ) ||
      (starterPack.salesPromotions ?? []).some(
        (item) =>
          isMissingOrPlaceholder(item.imageUrl) &&
          Boolean(item.imagePrompt)
      )
  );
}

/**
 * Ensure starter-pack images are filled with the global onboarding placeholder
 * when a real generated image is not yet available.
 *
 * Historically this used a tiny Unsplash pool keyed by a deterministic hash of
 * niche+name, which caused many stores to render the same 6 product / 4 promo
 * photos. We now always fall back to the onboarding placeholder SVG so that
 * duplicates are clearly a "pending" state rather than looking like real assets,
 * and the background Nano Banana job is responsible for filling in unique
 * per-tenant imagery.
 */
function ensureStarterPackImageUrls(payload: StarterPackPayload): StarterPackPayload {
  const placeholder = getOnboardingImagePlaceholderUrl();
  const demoProducts = (payload.demoProducts || []).map((item) => {
    const existing = typeof item.imageUrl === 'string' ? item.imageUrl.trim() : '';
    if (existing.length > 0) return item;
    return {
      ...item,
      imageUrl: placeholder,
    };
  });

  const salesPromotions = (payload.salesPromotions || []).map((item) => {
    const existing = typeof item.imageUrl === 'string' ? item.imageUrl.trim() : '';
    if (existing.length > 0) return item;
    return {
      ...item,
      imageUrl: placeholder,
    };
  });

  return {
    ...payload,
    demoProducts,
    salesPromotions,
  };
}

function buildSellingFallbackStarterPack(selling: string): StarterPackPayload {
  const niche = toTitleCase(selling) || 'Specialty';

  const categories = [
    `${niche} Essentials`,
    `${niche} Best Sellers`,
    `${niche} New Arrivals`,
    `${niche} Gift Sets`,
    `${niche} Premium Collection`,
    `${niche} Everyday Value`,
    `${niche} Featured Picks`,
    `${niche} Seasonal Offers`,
  ];

  return {
    copy: {
      headline: `Fresh ${niche} for Every Occasion`,
      subheadline: `Shop curated ${niche.toLowerCase()} collections tailored for your customers.`,
      ctaText: 'Shop the Collection',
    },
    categories,
    demoProducts: [
      {
        name: `${niche} Starter Pick 1`,
        priceKES: 1800,
        description: `A premium ${niche.toLowerCase()} product selected for quality and everyday demand.`,
      },
      {
        name: `${niche} Starter Pick 2`,
        priceKES: 2500,
        description: `A high-value ${niche.toLowerCase()} option ideal for customers seeking quality and value.`,
      },
      {
        name: `${niche} Starter Pick 3`,
        priceKES: 3200,
        description: `A bestselling ${niche.toLowerCase()} selection curated for repeat purchases.`,
      },
      {
        name: `${niche} Starter Pick 4`,
        priceKES: 4500,
        description: `A premium ${niche.toLowerCase()} product for customers looking for top-tier quality.`,
      },
      {
        name: `${niche} Starter Pick 5`,
        priceKES: 1200,
        description: `An affordable ${niche.toLowerCase()} option designed for quick conversions.`,
      },
      {
        name: `${niche} Starter Pick 6`,
        priceKES: 3800,
        description: `A standout ${niche.toLowerCase()} product that balances quality and strong margins.`,
      },
    ],
    salesPromotions: [
      {
        title: `${niche} Weekend Sale`,
        subtitle: `Save up to 20% on selected ${niche.toLowerCase()} products this weekend.`,
        ctaText: 'Shop Weekend Deals',
        imagePrompt: `4k promotional banner for ${niche.toLowerCase()} weekend sale, premium ecommerce marketing style`,
      },
      {
        title: `Same-Day ${niche} Delivery`,
        subtitle: `Order before 4PM and get your ${niche.toLowerCase()} picks delivered today.`,
        ctaText: 'Order for Today',
        imagePrompt: `4k ecommerce hero banner for same-day ${niche.toLowerCase()} delivery, clean modern composition, high-conversion marketing style`,
      },
    ],
    blogPosts: [
      {
        title: `${niche} Care Guide`,
        summary: `How to choose and care for premium ${niche.toLowerCase()} products at home.`,
      },
      {
        title: `Best ${niche} Gift Ideas`,
        summary: `Top curated ${niche.toLowerCase()} gift ideas for special occasions and everyday moments.`,
      },
    ],
  };
}

/**
 * Remove blob URLs from page builder content
 */
function cleanBlobUrlsFromPageBuilder(pageBuilderData: any): any {
  if (!pageBuilderData || !pageBuilderData.sections) {
    return pageBuilderData;
  }

  const cleanedSections = pageBuilderData.sections.map((section: any) => {
    const cleaned = { ...section };

    if (cleaned.type === 'hero' && cleaned.image && cleaned.image.startsWith('blob:')) {
      delete cleaned.image;
    }

    if (cleaned.type === 'image' && cleaned.image && cleaned.image.startsWith('blob:')) {
      delete cleaned.image;
    }

    if (cleaned.type === 'features' && cleaned.features) {
      cleaned.features = cleaned.features.map((feature: any) => {
        if (feature.image && feature.image.startsWith('blob:')) {
          delete feature.image;
        }
        return feature;
      });
    }

    if (cleaned.type === 'testimonials' && cleaned.testimonials) {
      cleaned.testimonials = cleaned.testimonials.map((testimonial: any) => {
        if (testimonial.image && testimonial.image.startsWith('blob:')) {
          delete testimonial.image;
        }
        return testimonial;
      });
    }

    return cleaned;
  });

  return {
    ...pageBuilderData,
    sections: cleanedSections,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractStarterPackPayload(jobResult: unknown): StarterPackPayload | null {
  if (!isRecord(jobResult)) return null;
  const data = jobResult.data;
  if (!isRecord(data)) return null;
  const gemini = data.gemini;
  if (!isRecord(gemini)) return null;
  const generatedStarterPack = gemini.generatedStarterPack;
  if (!isRecord(generatedStarterPack)) return null;

  const categories = Array.isArray(generatedStarterPack.categories)
    ? generatedStarterPack.categories.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  const demoProductsRaw = Array.isArray(generatedStarterPack.demoProducts)
    ? generatedStarterPack.demoProducts
    : [];

  const demoProducts: StarterPackProduct[] = demoProductsRaw
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => ({
      name: typeof item.name === 'string' ? item.name : '',
      priceKES: typeof item.priceKES === 'number' ? item.priceKES : Number(item.priceKES || 0),
      description: typeof item.description === 'string' ? item.description : '',
      imagePrompt: typeof item.imagePrompt === 'string' ? item.imagePrompt : undefined,
      nanoBananaPrompt: typeof item.nanoBananaPrompt === 'string' ? item.nanoBananaPrompt : undefined,
      imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined,
    }))
    .filter((item) => item.name.trim().length > 0);

  const salesPromotionsRaw = Array.isArray(generatedStarterPack.salesPromotions)
    ? generatedStarterPack.salesPromotions
    : [];

  const salesPromotions: StarterPackSalesPromotion[] = salesPromotionsRaw
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => ({
      title: typeof item.title === 'string' ? item.title : '',
      subtitle: typeof item.subtitle === 'string' ? item.subtitle : '',
      ctaText: typeof item.ctaText === 'string' ? item.ctaText : undefined,
      imagePrompt: typeof item.imagePrompt === 'string' ? item.imagePrompt : undefined,
      imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined,
    }))
    .filter((item) => item.title.trim().length > 0);

  const blogPostsRaw = Array.isArray(generatedStarterPack.blogPosts)
    ? generatedStarterPack.blogPosts
    : [];

  const blogPosts: StarterPackBlogPost[] = blogPostsRaw
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => ({
      title: typeof item.title === 'string' ? item.title : '',
      summary: typeof item.summary === 'string' ? item.summary : undefined,
    }))
    .filter((item) => item.title.trim().length > 0);

  const copy = isRecord(generatedStarterPack.copy)
    ? {
        headline: typeof generatedStarterPack.copy.headline === 'string' ? generatedStarterPack.copy.headline : undefined,
        subheadline: typeof generatedStarterPack.copy.subheadline === 'string' ? generatedStarterPack.copy.subheadline : undefined,
        ctaText: typeof generatedStarterPack.copy.ctaText === 'string' ? generatedStarterPack.copy.ctaText : undefined,
      }
    : undefined;

  const themeConfig = isRecord(generatedStarterPack.themeConfig)
    ? Object.entries(generatedStarterPack.themeConfig).reduce<Record<string, { hex: string; description?: string }>>(
        (acc, [key, rawValue]) => {
          if (!isRecord(rawValue)) return acc;
          if (typeof rawValue.hex !== 'string' || rawValue.hex.trim().length === 0) return acc;
          acc[key] = {
            hex: rawValue.hex,
            description: typeof rawValue.description === 'string' ? rawValue.description : undefined,
          };
          return acc;
        },
        {}
      )
    : undefined;

  if (categories.length === 0 && demoProducts.length === 0 && salesPromotions.length === 0 && blogPosts.length === 0 && !copy) {
    return null;
  }

  return {
    copy,
    themeConfig,
    categories,
    demoProducts,
    salesPromotions,
    blogPosts,
  };
}

function extractThemeColorsFromStarterPack(
  starterPack: StarterPackPayload | null | undefined,
): Record<string, string> {
  if (!starterPack?.themeConfig) {
    return {};
  }

  return Object.entries(starterPack.themeConfig).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value?.hex && typeof value.hex === 'string') {
      acc[key] = value.hex;
    }
    return acc;
  }, {});
}

async function getUniqueProductSlug(tenantId: string, name: string): Promise<string> {
  const base = generateSlug(name) || `product-${Date.now()}`;
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await prisma.products.findFirst({
      where: {
        tenant_id: tenantId,
        slug: candidate,
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

async function getUniqueSaleSlug(tenantId: string, name: string): Promise<string> {
  const base = generateSaleSlug(sanitizeSaleName(name)) || `sale-${Date.now()}`;
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await prisma.sales.findFirst({
      where: {
        tenant_id: tenantId,
        slug: candidate,
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

async function getUniqueBlogSlug(tenantId: string, title: string): Promise<string> {
  const base = generateSlug(title) || `blog-${Date.now()}`;
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await prisma.blogs.findFirst({
      where: {
        tenant_id: tenantId,
        slug: candidate,
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

async function applyStarterPackToTenant(
  tenantId: string,
  starterPack: StarterPackPayload,
  businessType?: string,
  selling?: string
): Promise<{ applied: boolean; categoriesCreated: number; productsCreated: number; salesCreated: number; blogsCreated: number }> {
  const categories = (starterPack.categories ?? []).slice(0, 12);
  const products = (starterPack.demoProducts ?? []).slice(0, 40);
  const salesPromotions = (starterPack.salesPromotions ?? []).slice(0, 2);
  const blogPosts = (starterPack.blogPosts ?? []).slice(0, 4);
  const placeholderImageUrl = getOnboardingImagePlaceholderUrl();

  if (
    categories.length === 0 &&
    products.length === 0 &&
    !starterPack.copy &&
    salesPromotions.length === 0 &&
    blogPosts.length === 0
  ) {
    return { applied: false, categoriesCreated: 0, productsCreated: 0, salesCreated: 0, blogsCreated: 0 };
  }

  const categoryIds: string[] = [];
  const categoryImageCandidates = new Map<string, string>();
  const createdProductIds: string[] = [];
  let categoriesCreated = 0;
  let productsCreated = 0;
  let salesCreated = 0;
  let blogsCreated = 0;

  for (const categoryName of categories) {
    const trimmed = categoryName.trim();
    if (!trimmed) continue;

    const existing = await prisma.categories.findFirst({
      where: {
        tenant_id: tenantId,
        name: { equals: trimmed, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existing) {
      categoryIds.push(existing.id);
      continue;
    }

    const created = await prisma.categories.create({
      data: {
        tenant_id: tenantId,
        name: trimmed,
        slug: generateSlug(trimmed),
        status: 'active',
      },
      select: { id: true },
    });
    categoryIds.push(created.id);
    categoriesCreated += 1;
  }

  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    const name = product.name.trim();
    if (!name) continue;

    const price = Number(product.priceKES);
    const validPrice = Number.isFinite(price) && price > 0 ? price : 100;
    const slug = await getUniqueProductSlug(tenantId, name);
    const categoryId = categoryIds.length > 0 ? categoryIds[index % categoryIds.length] : null;
    const resolvedProductImage =
      typeof product.imageUrl === 'string' && product.imageUrl.trim().length > 0
        ? product.imageUrl.trim()
        : placeholderImageUrl;

    const createdProduct = await prisma.products.create({
      data: {
        tenant_id: tenantId,
        name,
        slug,
        description: product.description || null,
        short_description: product.description ? product.description.slice(0, 160) : null,
        price: validPrice,
        stock_quantity: 20,
        status: 'active',
        image: resolvedProductImage,
        category_id: categoryId,
        sku: `SP-${String(index + 1).padStart(3, '0')}-${Date.now().toString().slice(-6)}`,
        metadata: buildDemoProductMetadata('starter_pack_ai', 'onboarding_starter_pack', {
          generated_image_prompt: product.imagePrompt ?? product.nanoBananaPrompt ?? null,
        }),
      },
    });
    createdProductIds.push(createdProduct.id);
    if (categoryId && resolvedProductImage.trim().length > 0) {
      if (!categoryImageCandidates.has(categoryId)) {
        categoryImageCandidates.set(categoryId, resolvedProductImage);
      }
    }
    productsCreated += 1;
  }

  for (const [categoryId, imageUrl] of categoryImageCandidates.entries()) {
    await prisma.categories.update({
      where: { id: categoryId },
      data: {
        image: imageUrl,
      },
    });
  }

  for (let index = 0; index < salesPromotions.length; index += 1) {
    const promotion = salesPromotions[index];
    const saleName = sanitizeSaleName(promotion.title?.trim() || '');
    if (!saleName) continue;

    const saleSlug = await getUniqueSaleSlug(tenantId, saleName);
    const now = new Date();
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const resolvedPromotionImage =
      typeof promotion.imageUrl === 'string' && promotion.imageUrl.trim().length > 0
        ? promotion.imageUrl.trim()
        : placeholderImageUrl;

    const sale = await prisma.sales.create({
      data: {
        tenant_id: tenantId,
        name: saleName,
        slug: saleSlug,
        description: promotion.subtitle || null,
        badge_text: (promotion.ctaText || 'SALE').slice(0, 50),
        badge_color: index % 2 === 0 ? '#EF4444' : '#10B981',
        start_date: now,
        end_date: endDate,
        status: 'active',
        is_featured: true,
        banner_image: resolvedPromotionImage,
        metadata: {
          source: 'starter_pack_ai',
          image_prompt: promotion.imagePrompt || null,
        },
      },
      select: { id: true },
    });
    salesCreated += 1;

    const saleProducts = createdProductIds.slice(0, 6);
    for (let productOrder = 0; productOrder < saleProducts.length; productOrder += 1) {
      const productId = saleProducts[productOrder];
      const product = await prisma.products.findUnique({
        where: { id: productId },
        select: { price: true },
      });
      if (!product) continue;

      const discountPercent = 10 + ((index + productOrder) % 15);
      const salePrice = Number(product.price) * (1 - discountPercent / 100);

      await prisma.product_sales.create({
        data: {
          tenant_id: tenantId,
          product_id: productId,
          sale_id: sale.id,
          sale_price: Number(salePrice.toFixed(2)),
          discount_percent: discountPercent,
          order_index: productOrder,
        },
      });
    }
  }

  if (blogPosts.length > 0) {
    let blogCategoryId: string | null = null;
    const existingBlogCategory = await prisma.blog_categories.findFirst({
      where: {
        tenant_id: tenantId,
        name: { equals: 'Tips & Guides', mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existingBlogCategory) {
      blogCategoryId = existingBlogCategory.id;
    } else {
      const createdBlogCategory = await prisma.blog_categories.create({
        data: {
          tenant_id: tenantId,
          name: 'Tips & Guides',
          slug: 'tips-guides',
        },
        select: { id: true },
      });
      blogCategoryId = createdBlogCategory.id;
    }

    for (const post of blogPosts) {
      const title = post.title.trim();
      if (!title) continue;
      const slug = await getUniqueBlogSlug(tenantId, title);
      const excerpt = (post.summary || '').trim();
      const content = `<h1>${title}</h1><p>${excerpt || `Discover insights about ${selling || 'your products'} and smarter shopping decisions.`}</p>`;
      const existingBlog = await prisma.blogs.findFirst({
        where: {
          tenant_id: tenantId,
          title: { equals: title, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (existingBlog) continue;

      await prisma.blogs.create({
        data: {
          tenant_id: tenantId,
          title,
          slug,
          excerpt: excerpt || null,
          content,
          category_id: blogCategoryId,
          status: 'published',
          image:
            products.find((item) => typeof item.imageUrl === 'string' && item.imageUrl.trim().length > 0)?.imageUrl ||
            placeholderImageUrl,
        },
      });
      blogsCreated += 1;
    }
  }

  const tenantRecord = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { data: true },
  });
  const existingData = isRecord(tenantRecord?.data) ? tenantRecord.data : {};

  await prisma.tenants.update({
    where: { id: tenantId },
    data: {
      data: {
        ...existingData,
        business_type: businessType || existingData.business_type,
        selling: selling || existingData.selling,
        onboarding_starter_pack: {
          copy: starterPack.copy || null,
          themeConfig: starterPack.themeConfig || null,
          categories,
          salesPromotions,
          productImages: products
            .filter((item) => typeof item.imageUrl === 'string' && item.imageUrl.trim().length > 0)
            .map((item) => ({
              name: item.name,
              imageUrl: item.imageUrl,
            })),
          products_count: productsCreated,
          categories_count: categoriesCreated,
          sales_count: salesCreated,
          blogs_count: blogsCreated,
          applied_at: new Date().toISOString(),
        },
      } as unknown as Prisma.InputJsonValue,
    },
  });

  if (starterPack.themeConfig && Object.keys(starterPack.themeConfig).length > 0) {
    const activeTenantTheme = await prisma.tenant_themes.findFirst({
      where: {
        tenant_id: tenantId,
        is_active: true,
      },
      select: {
        id: true,
        custom_colors: true,
      },
    });

    if (activeTenantTheme) {
      const existingColors =
        activeTenantTheme.custom_colors &&
        typeof activeTenantTheme.custom_colors === 'object' &&
        !Array.isArray(activeTenantTheme.custom_colors)
          ? (activeTenantTheme.custom_colors as Record<string, unknown>)
          : {};

      const aiColors = Object.entries(starterPack.themeConfig).reduce<Record<string, string>>((acc, [key, value]) => {
        if (value?.hex && typeof value.hex === 'string') {
          acc[key] = value.hex;
        }
        return acc;
      }, {});

      await prisma.tenant_themes.update({
        where: { id: activeTenantTheme.id },
        data: {
          custom_colors: ({
            ...existingColors,
            ...aiColors,
          } as unknown as Prisma.InputJsonValue),
        },
      });

      console.log('[Registration] Applied AI theme colors to active tenant theme', {
        tenantId,
        tenantThemeId: activeTenantTheme.id,
        aiColorKeys: Object.keys(aiColors),
        aiColors,
      });
    }
  }

  const homePage = await prisma.pages.findFirst({
    where: {
      tenant_id: tenantId,
      slug: 'home',
    },
    select: {
      id: true,
      content: true,
    },
  });

  if (homePage?.content) {
    try {
      const pageBuilderData = JSON.parse(homePage.content) as {
        sections?: Array<Record<string, unknown>>;
      };
      if (Array.isArray(pageBuilderData.sections)) {
        const firstPromoImage = salesPromotions.find(
          (item) => typeof item.imageUrl === 'string' && item.imageUrl.trim().length > 0
        )?.imageUrl;
        const firstProductImage = products.find(
          (item) => typeof item.imageUrl === 'string' && item.imageUrl.trim().length > 0
        )?.imageUrl;
        const bestStarterPackImage = firstPromoImage || firstProductImage || placeholderImageUrl;

        const updatedSections = pageBuilderData.sections.map((section) => {
          if (section.type === 'hero') {
            return {
              ...section,
              title: starterPack.copy?.headline || section.title,
              subtitle: starterPack.copy?.subheadline || section.subtitle,
              cta_text: starterPack.copy?.ctaText || section.cta_text,
              image: bestStarterPackImage,
            };
          }

          if (
            section.type === 'banners' &&
            Array.isArray(section.banners) &&
            section.banners.length > 0 &&
            (salesPromotions.length > 0 || products.length > 0)
          ) {
            const existingBanners = section.banners as Array<Record<string, unknown>>;
            const nextBanners = [...existingBanners];

            for (let i = 0; i < nextBanners.length; i += 1) {
              const promotion = salesPromotions[i];
              if (promotion) {
                nextBanners[i] = {
                  ...nextBanners[i],
                  title: promotion.title || nextBanners[i]?.title,
                  // Intentionally omit subtitle: onboarding banners should
                  // render clean (title + CTA only). The promotion subtitle
                  // is still persisted on the `sales` row (as description)
                  // for the sales detail page; merchants can re-enable the
                  // banner subtitle from the page builder if they want.
                  subtitle: '',
                  cta_text: promotion.ctaText || nextBanners[i]?.cta_text,
                  image: promotion.imageUrl?.trim() || placeholderImageUrl,
                };
              } else {
                nextBanners[i] = {
                  ...nextBanners[i],
                  title: 'Shop the collection',
                  subtitle: '',
                  image: placeholderImageUrl,
                };
              }
            }

            return {
              ...section,
              banners: nextBanners,
            };
          }

          if (section.type === 'split_layout' && isRecord(section.left_side)) {
            return {
              ...section,
              left_side: {
                ...section.left_side,
                image: bestStarterPackImage,
              },
            };
          }

          return section;
        });

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
    } catch (error) {
      console.warn('[Registration] Failed to apply starter-pack copy/promotions to homepage', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown homepage starter-pack apply error',
      });
    }
  }

  return {
    applied: true,
    categoriesCreated,
    productsCreated,
    salesCreated,
    blogsCreated,
  };
}

async function applyStarterPackImagesToTenant(
  tenantId: string,
  starterPack: StarterPackPayload
): Promise<{ productsUpdated: number; salesUpdated: number; categoriesUpdated: number; blogsUpdated: number }> {
  const placeholderImageUrl = getOnboardingImagePlaceholderUrl();
  const products = (starterPack.demoProducts ?? []).filter(
    (item) => typeof item.imageUrl === 'string' && item.imageUrl.trim().length > 0
  );
  const promotions = (starterPack.salesPromotions ?? []).filter(
    (item) => typeof item.imageUrl === 'string' && item.imageUrl.trim().length > 0
  );

  let productsUpdated = 0;
  let salesUpdated = 0;
  let categoriesUpdated = 0;
  let blogsUpdated = 0;
  const categoryImageCandidates = new Map<string, string>();

  for (const product of products) {
    const imageUrl = product.imageUrl!.trim();
    const existingProduct = await prisma.products.findFirst({
      where: {
        tenant_id: tenantId,
        name: { equals: product.name, mode: 'insensitive' },
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        image: true,
        category_id: true,
      },
    });
    if (!existingProduct) continue;

    if (existingProduct.image !== imageUrl) {
      await prisma.products.update({
        where: { id: existingProduct.id },
        data: { image: imageUrl },
      });
      productsUpdated += 1;
    }

    if (existingProduct.category_id && !categoryImageCandidates.has(existingProduct.category_id)) {
      categoryImageCandidates.set(existingProduct.category_id, imageUrl);
    }
  }

  for (const [categoryId, imageUrl] of categoryImageCandidates.entries()) {
    await prisma.categories.update({
      where: { id: categoryId },
      data: { image: imageUrl },
    });
    categoriesUpdated += 1;
  }

  const salesOrderedByCreation = await prisma.sales.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'asc' },
    take: 12,
    select: { id: true, banner_image: true, name: true },
  });
  const fullPromotionsList = starterPack.salesPromotions ?? [];

  for (const promotion of promotions) {
    const imageUrl = promotion.imageUrl!.trim();
    const saleLookupName = sanitizeSaleName(promotion.title?.trim() || '');
    if (!saleLookupName) continue;

    let existingSale = await prisma.sales.findFirst({
      where: {
        tenant_id: tenantId,
        name: { equals: saleLookupName, mode: 'insensitive' },
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        banner_image: true,
      },
    });

    if (!existingSale && promotion.title?.trim()) {
      existingSale = await prisma.sales.findFirst({
        where: {
          tenant_id: tenantId,
          name: { equals: promotion.title.trim(), mode: 'insensitive' },
        },
        orderBy: { created_at: 'desc' },
        select: { id: true, banner_image: true },
      });
    }

    if (!existingSale) {
      const promoIndex = fullPromotionsList.findIndex((p) => {
        const t = p.title?.trim() || '';
        return sanitizeSaleName(t) === saleLookupName || t.toLowerCase() === promotion.title?.trim().toLowerCase();
      });
      if (promoIndex >= 0 && salesOrderedByCreation[promoIndex]) {
        existingSale = salesOrderedByCreation[promoIndex];
      }
    }

    if (!existingSale) continue;

    if (existingSale.banner_image !== imageUrl) {
      await prisma.sales.update({
        where: { id: existingSale.id },
        data: { banner_image: imageUrl },
      });
      salesUpdated += 1;
    }
  }

  const generatedImagePool = Array.from(
    new Set(
      [
        ...products.map((item) => item.imageUrl?.trim()).filter((item): item is string => Boolean(item)),
        ...promotions.map((item) => item.imageUrl?.trim()).filter((item): item is string => Boolean(item)),
      ]
    )
  );

  if (generatedImagePool.length > 0) {
    const starterPackBlogs = starterPack.blogPosts ?? [];
    for (let index = 0; index < starterPackBlogs.length; index += 1) {
      const blog = starterPackBlogs[index];
      const title = blog.title?.trim();
      if (!title) continue;

      const existingBlog = await prisma.blogs.findFirst({
        where: {
          tenant_id: tenantId,
          title: { equals: title, mode: 'insensitive' },
        },
        orderBy: { created_at: 'desc' },
        select: { id: true, image: true },
      });
      if (!existingBlog) continue;

      const currentImg = existingBlog.image?.trim() ?? '';
      const needsImage =
        currentImg.length === 0 || isOnboardingPlaceholderUrl(existingBlog.image);
      if (!needsImage) continue;

      const imageUrl = generatedImagePool[index % generatedImagePool.length];
      if (existingBlog.image === imageUrl) continue;

      await prisma.blogs.update({
        where: { id: existingBlog.id },
        data: { image: imageUrl },
      });
      blogsUpdated += 1;
    }

    const remainingBlogs = await prisma.blogs.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          { image: null },
          { image: '' },
          { image: { contains: 'onboarding-product-placeholder', mode: 'insensitive' } },
        ],
      },
      select: { id: true, image: true },
      orderBy: { created_at: 'desc' },
      take: Math.max(4, generatedImagePool.length),
    });

    for (let index = 0; index < remainingBlogs.length; index += 1) {
      const blog = remainingBlogs[index];
      const currentImg = blog.image?.trim() ?? '';
      if (currentImg.length > 0 && !isOnboardingPlaceholderUrl(blog.image)) continue;

      const imageUrl = generatedImagePool[index % generatedImagePool.length];
      await prisma.blogs.update({
        where: { id: blog.id },
        data: { image: imageUrl },
      });
      blogsUpdated += 1;
    }
  }

  const homePage = await prisma.pages.findFirst({
    where: {
      tenant_id: tenantId,
      slug: 'home',
    },
    select: {
      id: true,
      content: true,
    },
  });

  if (homePage?.content) {
    try {
      const pageBuilderData = JSON.parse(homePage.content) as {
        sections?: Array<Record<string, unknown>>;
      };
      if (Array.isArray(pageBuilderData.sections)) {
        const firstPromoImage = promotions[0]?.imageUrl;
        const firstProductImage = products[0]?.imageUrl;
        const bestStarterPackImage = firstPromoImage || firstProductImage;
        const updatedSections = pageBuilderData.sections.map((section) => {
          if (section.type === 'hero' && bestStarterPackImage) {
            return {
              ...section,
              image: bestStarterPackImage,
            };
          }
          if (section.type === 'banners' && Array.isArray(section.banners) && section.banners.length > 0) {
            const existingBanners = section.banners as Array<Record<string, unknown>>;
            const nextBanners = [...existingBanners];
            const fullPromotions = starterPack.salesPromotions ?? [];
            const pool = generatedImagePool;
            for (let i = 0; i < nextBanners.length; i += 1) {
              const promotionAtIndex = fullPromotions[i];
              const fromPromo =
                promotionAtIndex && typeof promotionAtIndex.imageUrl === 'string'
                  ? promotionAtIndex.imageUrl.trim()
                  : '';
              const chosen =
                fromPromo ||
                (pool.length > 0 ? pool[i % pool.length] : '') ||
                placeholderImageUrl;
              nextBanners[i] = {
                ...nextBanners[i],
                image: chosen,
              };
            }
            return {
              ...section,
              banners: nextBanners,
            };
          }
          if (section.type === 'split_layout' && bestStarterPackImage && isRecord(section.left_side)) {
            return {
              ...section,
              left_side: {
                ...section.left_side,
                image: bestStarterPackImage,
              },
            };
          }
          return section;
        });

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
    } catch (error) {
      console.warn('[Registration] Failed to apply starter-pack images to homepage', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown homepage image apply error',
      });
    }
  }

  const tenantRecord = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { data: true },
  });
  const existingData = isRecord(tenantRecord?.data) ? tenantRecord.data : {};
  const existingStarterPack = isRecord(existingData.onboarding_starter_pack)
    ? (existingData.onboarding_starter_pack as Record<string, unknown>)
    : {};
  await prisma.tenants.update({
    where: { id: tenantId },
    data: {
      data: {
        ...existingData,
        onboarding_starter_pack: {
          ...existingStarterPack,
          salesPromotions: starterPack.salesPromotions ?? existingStarterPack.salesPromotions ?? [],
          productImages: products.map((item) => ({
            name: item.name,
            imageUrl: item.imageUrl,
          })),
          images_applied_at: new Date().toISOString(),
        },
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return { productsUpdated, salesUpdated, categoriesUpdated, blogsUpdated };
}

const registerTenantSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain must be at most 63 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
  adminName: z.string().min(1, 'Admin name is required').optional(),
  authProvider: z.enum(['google', 'email']).default('email'),
  contactEmail: z.string().email('Invalid contact email address').optional(),
  planId: z.string().uuid().optional(),
  themeId: z.string().uuid().optional(),
  businessType: z.string().optional(),
  selling: z.string().optional(),
  starterPackJobId: z.string().uuid().optional(),
  /** Accepted for API compatibility; catalog/demo seeding is not performed at registration. */
  includeDemoContent: z.boolean().optional(),
  /** Accepted for API compatibility; ignored at registration (clean catalog). */
  includeDemoAttributes: z.boolean().optional(),
  includeMerchantStore: z.boolean().optional(),
  /** Optional for mobile Google sign-up: Supabase session access token */
  supabaseAccessToken: z.string().optional(),
  /** Optional for mobile Google sign-up: Google OIDC id_token (server exchanges via Supabase) */
  googleIdToken: z.string().optional(),
  /** Optional companion token for id_token flows that include at_hash */
  googleAccessToken: z.string().optional(),
  /** National or international format — validated with libphonenumber */
  adminPhone: z.string().trim().min(1, 'Store phone number is required'),
  /** ISO 3166-1 alpha-2; defaults to KE on the server if omitted */
  adminPhoneCountry: z.string().length(2).optional(),
  /** Billing region for subscription pricing (ISO 3166-1 alpha-2, e.g. KE, US) */
  billingCountry: z.string().length(2).optional(),
  /** Optional referrer store subdomain (unique public identifier). */
  referrerSubdomain: z.string().min(3).max(63).regex(/^[a-z0-9-]+$/, {
    message: 'Referrer subdomain can only contain lowercase letters, numbers, and hyphens',
  }).optional(),
});

export async function POST(request: NextRequest) {
  const registrationTraceId = `reg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const body = await request.json();
    const validatedData = registerTenantSchema.parse(body);
    // Clean install: no demo products, categories, sales, blogs, or generic demo content.
    // Optional starterPackJobId may still supply theme colors only; applyStarterPackToTenant never runs.
    const includeDemoContent = false;

    const phoneCountry = (
      validatedData.adminPhoneCountry?.toUpperCase() &&
      isKnownCountryCode(validatedData.adminPhoneCountry.toUpperCase())
        ? validatedData.adminPhoneCountry.toUpperCase()
        : 'KE'
    ) as CountryCode;
    const e164Normalized = parseToE164Digits(validatedData.adminPhone, phoneCountry);
    if (!e164Normalized) {
      return NextResponse.json(
        {
          message: 'Invalid phone number',
          errors: [{ field: 'adminPhone', message: 'Enter a valid phone number for the selected country' }],
        },
        { status: 400 },
      );
    }
    const normalizedAdminPhoneE164 = e164Normalized;
    console.log('[Registration][Trace] Request received', {
      traceId: registrationTraceId,
      subdomain: validatedData.subdomain,
      authProvider: validatedData.authProvider,
      businessType: validatedData.businessType || null,
      selling: validatedData.selling || null,
      includeDemoContent,
      includeMerchantStore: Boolean(validatedData.includeMerchantStore),
      starterPackJobId: validatedData.starterPackJobId || null,
      hasPlanId: Boolean(validatedData.planId),
    });

    const clientCountry = request.headers.get('x-user-country');
    const geoCountry =
      detectUserLocation(request.headers).countryCode ||
      request.headers.get('x-vercel-ip-country') ||
      request.headers.get('cf-ipcountry');

    const countryCode = resolveTenantBillingCountry({
      billingCountry: validatedData.billingCountry,
      clientCountry,
      geoCountry,
      adminPhoneCountry: phoneCountry,
    });
    const locationInfo = getPricingInfoForCountry(countryCode);

    // Validate subdomain
    const subdomainValidation = validateSubdomain(validatedData.subdomain);
    if (!subdomainValidation.isValid) {
      return NextResponse.json(
        { message: subdomainValidation.error },
        { status: 400 }
      );
    }

    // Check if subdomain already exists - SIMPLIFIED: Only check subdomain
    const existingTenant = await prisma.tenants.findUnique({
      where: { subdomain: validatedData.subdomain },
    });

    if (existingTenant) {
      return NextResponse.json(
        {
          message: 'This subdomain is already taken. Please choose another.',
          errors: [{ field: 'subdomain', message: 'Subdomain taken — choose another' }],
        },
        { status: 409 }
      );
    }

    // Verify plan exists if provided
    let plan = null;
    if (validatedData.planId) {
      plan = await prisma.price_plans.findUnique({
        where: { id: validatedData.planId },
      });

      if (!plan || plan.status !== 'active') {
        return NextResponse.json(
          { message: 'Selected pricing plan is not available' },
          { status: 400 }
        );
      }
    }

    if (!plan) {
      plan = await getDefaultRegistrationPlan();
    }

    const effectivePlanId = plan?.id ?? null;

    // Calculate expiration date
    let expireDate: Date | null = null;
    if (plan) {
      expireDate = new Date();
      if (plan.trial_days && plan.trial_days > 0) {
        expireDate.setDate(expireDate.getDate() + plan.trial_days);
      } else {
        expireDate.setMonth(expireDate.getMonth() + plan.duration_months);
      }
    }

    const adminClient = createAdminClient();
    let existingUser: {
      id: string;
      email?: string;
      user_metadata?: Record<string, any>;
    } | null = null;
    const maxPagesToSearch = 5;
    const perPage = 1000;

    if (validatedData.authProvider === 'google') {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
      if (!token && validatedData.supabaseAccessToken) {
        token = validatedData.supabaseAccessToken;
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json(
          { message: 'Supabase client configuration missing' },
          { status: 500 }
        );
      }

      const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);
      let googleUser:
        | {
            id: string;
            email?: string;
            user_metadata?: Record<string, any>;
          }
        | null = null;

      // Preferred path: use an existing Supabase session token (same as web flow).
      if (token) {
        const { data: authData, error: authError } = await supabase.auth.getUser(token);
        if (!authError && authData.user) {
          googleUser = {
            id: authData.user.id,
            email: authData.user.email,
            user_metadata: authData.user.user_metadata ?? {},
          };
        }
      }

      // Mobile fallback: exchange Google id_token directly through Supabase.
      if (!googleUser && validatedData.googleIdToken) {
        const { data: idTokenData, error: idTokenError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: validatedData.googleIdToken,
          ...(validatedData.googleAccessToken ? { access_token: validatedData.googleAccessToken } : {}),
        });

        if (!idTokenError && idTokenData.user) {
          googleUser = {
            id: idTokenData.user.id,
            email: idTokenData.user.email,
            user_metadata: idTokenData.user.user_metadata ?? {},
          };
        }
      }

      if (!googleUser) {
        return NextResponse.json(
          { message: 'Google session is invalid or expired' },
          { status: 401 }
        );
      }

      if (googleUser.email?.toLowerCase() !== validatedData.adminEmail.toLowerCase()) {
        return NextResponse.json(
          { message: 'Authenticated Google user does not match registration email' },
          { status: 403 }
        );
      }

      existingUser = googleUser;
    } else {
      for (let page = 1; page <= maxPagesToSearch; page++) {
        const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({
          page,
          perPage,
        });

        if (listError) {
          console.error('Error listing users:', listError);
          // Continue with user creation if listing fails
          break;
        }

        // Find user by email (case-insensitive)
        existingUser = users.find((user) =>
          user.email?.toLowerCase() === validatedData.adminEmail.toLowerCase()
        ) ?? null;

        if (existingUser) {
          break;
        }

        // If no more users, user doesn't exist
        if (users.length === 0 || users.length < perPage) {
          break;
        }
      }
    }

    // Get plan details if plan is selected
    let subscriptionPrice: number | null = null;
    let subscriptionCurrency: 'KES' | 'USD' = 'USD';
    let subscriptionCurrencySymbol: 'Ksh' | '$' = '$';
    
    if (plan) {
      subscriptionPrice = resolvePlanMonthlyPrice(
        { price: plan.price, price_kes: plan.price_kes },
        locationInfo.isKenya,
      );
      subscriptionCurrency = locationInfo.currency;
      subscriptionCurrencySymbol = locationInfo.currencySymbol;
    }

    if (validatedData.authProvider === 'email' && !validatedData.adminPassword) {
      return NextResponse.json(
        { message: 'Password is required for email signup' },
        { status: 400 }
      );
    }

    const resolvedAdminName =
      validatedData.adminName?.trim() ||
      existingUser?.user_metadata?.full_name ||
      existingUser?.user_metadata?.name ||
      validatedData.name;
    const existingProfileCompleted =
      existingUser?.user_metadata?.profile_completed === true;
    const shouldMarkProfileCompleted =
      validatedData.authProvider === 'email' ? true : existingProfileCompleted;

    let effectiveThemeId = validatedData.themeId;
    if (!effectiveThemeId) {
      const defaultTheme = await prisma.themes.findFirst({
        where: {
          status: true,
          OR: [
            { slug: { equals: 'multipurpose', mode: 'insensitive' } },
            { slug: { equals: 'grocery', mode: 'insensitive' } },
            { title: { contains: 'multipurpose', mode: 'insensitive' } },
          ],
        },
      });
      effectiveThemeId = defaultTheme?.id;
    }

    const finalSelling =
      validatedData.selling?.trim() ||
      validatedData.businessType?.trim() ||
      undefined;
    // DA.21 — the REAL, un-defaulted signal for "did the merchant say what
    // they're selling". businessType is mandatory (frontend-enforced,
    // src/app/register/page.tsx), so finalSelling above always resolves to
    // *something* — it can never tell you whether niche was actually given.
    // Still used to GROUND the 5 generic images below (more relevant
    // imagery when niche is known) — no longer used as an on/off switch for
    // the full starter pack, see ENABLE_FULL_AI_STARTER_PACK.
    const nicheGiven = Boolean(validatedData.selling?.trim());
    // DA.21 — scope widened per direct user request ("stop the 8-product/
    // 10-image path entirely"): the full AI starter pack (8 demoProducts +
    // 8 categories + 2 salesPromotions + 10 images) is now disabled for
    // EVERY new registration, not just the niche-empty case — every new
    // store gets the lighter 5-generic-image treatment (hero + 3 banners +
    // split-layout), no invented demo products/categories, regardless of
    // whether niche was given. Left as a single flag (not deleted code)
    // in case this is ever revisited — every gate below reads this, not a
    // hardcoded literal, so re-enabling is a one-line change if needed.
    const ENABLE_FULL_AI_STARTER_PACK = false;

    let starterPackPayload: StarterPackPayload | null = null;
    if (validatedData.starterPackJobId) {
      try {
        const starterPackJob = await prisma.cron_job_logs.findUnique({
          where: { id: validatedData.starterPackJobId },
          select: {
            id: true,
            job_name: true,
            status: true,
            result: true,
          },
        });

        if (
          starterPackJob &&
          starterPackJob.job_name === 'onboarding_starter_pack_generation' &&
          starterPackJob.status === 'success'
        ) {
          starterPackPayload = extractStarterPackPayload(starterPackJob.result);
          if (starterPackPayload) {
            console.log('[Registration] Starter-pack payload loaded for registration apply', {
              traceId: registrationTraceId,
              jobId: starterPackJob.id,
              categories: starterPackPayload.categories?.length ?? 0,
              products: starterPackPayload.demoProducts?.length ?? 0,
            });
          } else {
            console.warn('[Registration][Trace] Starter-pack job exists but payload could not be extracted', {
              traceId: registrationTraceId,
              jobId: starterPackJob.id,
            });
          }
        } else {
          console.warn('[Registration][Trace] Starter-pack job unavailable or not successful', {
            traceId: registrationTraceId,
            found: Boolean(starterPackJob),
            status: starterPackJob?.status || null,
            jobName: starterPackJob?.job_name || null,
          });
        }
      } catch (starterPackLookupError) {
        console.warn('[Registration] Failed to load starter-pack job for apply', {
          traceId: registrationTraceId,
          error:
            starterPackLookupError instanceof Error
              ? starterPackLookupError.message
              : 'Unknown starter-pack lookup error',
        });
      }
    }

    // Run Gemini in foreground (fast) and defer image generation to background.
    // DA.21: full AI starter pack disabled — see ENABLE_FULL_AI_STARTER_PACK above.
    if (
      !starterPackPayload &&
      includeDemoContent &&
      ENABLE_FULL_AI_STARTER_PACK &&
      validatedData.businessType
    ) {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      try {
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), 45000);

        const starterPackResponse = await fetch(`${request.nextUrl.origin}/api/onboarding/starter-pack`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Registration-Trace-Id': registrationTraceId,
          },
          signal: controller.signal,
          body: JSON.stringify({
            businessType: validatedData.businessType,
            selling: finalSelling,
            themeId: effectiveThemeId,
            locale: 'en-KE',
            currency: 'KES',
            productsCount: 8,
            categoriesCount: 8,
            blogPostsCount: 2,
            includeGeminiCall: true,
            includeNanoBananaCall: false,
            checkSellingExists: true,
            forceExternalGeneration: false,
            geminiModel: 'gemini-2.5-flash',
          }),
        });
        const starterPackData = await starterPackResponse.json();
        if (starterPackResponse.ok && starterPackData?.success) {
          starterPackPayload = extractStarterPackPayload(starterPackData);
          if (starterPackPayload) {
            console.log('[Registration] Starter-pack generated in foreground (Gemini only)', {
              traceId: registrationTraceId,
              categories: starterPackPayload.categories?.length ?? 0,
              products: starterPackPayload.demoProducts?.length ?? 0,
            });
          }
        }
      } catch (starterPackForegroundError) {
        console.warn('[Registration] Foreground starter-pack generation failed, will continue with background setup', {
          traceId: registrationTraceId,
          error:
            starterPackForegroundError instanceof Error
              ? starterPackForegroundError.message
              : 'Unknown starter-pack foreground error',
        });
      } finally {
        if (timeout) {
          clearTimeout(timeout);
        }
      }
    }

    // Guarantee starter-pack content for registration even if Gemini fails.
    // DA.21: full AI starter pack disabled — see ENABLE_FULL_AI_STARTER_PACK
    // above; this would otherwise deterministically invent 8 fake products,
    // exactly what that flag exists to prevent.
    if (!starterPackPayload && includeDemoContent && ENABLE_FULL_AI_STARTER_PACK && finalSelling) {
      starterPackPayload = buildSellingFallbackStarterPack(finalSelling);
      console.warn('[Registration] Starter-pack API unavailable; using deterministic selling fallback', {
        traceId: registrationTraceId,
        selling: finalSelling,
        categories: starterPackPayload.categories?.length ?? 0,
        products: starterPackPayload.demoProducts?.length ?? 0,
      });
    }

    if (starterPackPayload && includeDemoContent && finalSelling) {
      const hasCategories = Array.isArray(starterPackPayload.categories) && starterPackPayload.categories.length > 0;
      const hasProducts = Array.isArray(starterPackPayload.demoProducts) && starterPackPayload.demoProducts.length > 0;
      const hasSalesPromotions =
        Array.isArray(starterPackPayload.salesPromotions) && starterPackPayload.salesPromotions.length > 0;
      if (!hasCategories || !hasProducts || !hasSalesPromotions) {
        const fallbackPack = buildSellingFallbackStarterPack(finalSelling);
        starterPackPayload = {
          ...starterPackPayload,
          categories: hasCategories ? starterPackPayload.categories : fallbackPack.categories,
          demoProducts: hasProducts ? starterPackPayload.demoProducts : fallbackPack.demoProducts,
          salesPromotions: hasSalesPromotions
            ? starterPackPayload.salesPromotions
            : fallbackPack.salesPromotions,
        };
        console.log('[Registration] Starter-pack payload was partial; merged selling-based fallback catalog', {
          traceId: registrationTraceId,
          selling: finalSelling,
          categories: starterPackPayload.categories?.length ?? 0,
          products: starterPackPayload.demoProducts?.length ?? 0,
          preservedThemeConfig: Boolean(
            starterPackPayload.themeConfig && Object.keys(starterPackPayload.themeConfig).length > 0
          ),
          preservedSalesPromotions: starterPackPayload.salesPromotions?.length ?? 0,
        });
      }

      starterPackPayload = ensureStarterPackImageUrls(starterPackPayload);
    }

    // Create tenant in database
    const tenant = await prisma.tenants.create({
      data: {
        name: validatedData.name,
        subdomain: validatedData.subdomain,
        contact_email: validatedData.contactEmail ?? validatedData.adminEmail,
        status: 'active',
        start_date: new Date(),
        plan_id: effectivePlanId,
        expire_date: expireDate,
        country: countryCode, // Store country code
        data: {
          theme: 'light',
          business_type: validatedData.businessType || undefined,
          selling: finalSelling,
          admin_phone: normalizedAdminPhoneE164,
          admin_phone_country: phoneCountry,
          // Store subscription pricing info for future payments
          subscription: plan
            ? {
                currency: subscriptionCurrency,
                currencySymbol: subscriptionCurrencySymbol,
                price: subscriptionPrice,
                priceUsd: Number(plan.price),
                priceKes: plan.price_kes != null ? Number(plan.price_kes) : null,
                planName: plan.name,
                billingCountry: countryCode,
              }
            : null,
        },
      },
    });

    if (validatedData.referrerSubdomain) {
      const referrerSubdomainValidation = validateSubdomain(validatedData.referrerSubdomain);
      if (!referrerSubdomainValidation.isValid) {
        console.warn('[Registration] Referral attribution skipped', {
          traceId: registrationTraceId,
          referrerSubdomain: validatedData.referrerSubdomain,
          reason: referrerSubdomainValidation.error ?? 'Invalid referrer subdomain',
        });
      } else {
        try {
          const referralResult = await createTenantReferralAttribution({
            referrerSubdomain: validatedData.referrerSubdomain,
            referredTenantId: tenant.id,
            referredSubdomain: tenant.subdomain,
          });
          if (!referralResult.created) {
            console.warn('[Registration] Referral attribution skipped', {
              traceId: registrationTraceId,
              referrerSubdomain: validatedData.referrerSubdomain,
              referredTenantId: tenant.id,
              reason: referralResult.reason ?? 'unknown',
            });
          }
        } catch (referralError) {
          console.error('[Registration] Failed to create referral attribution:', referralError);
        }
      }
    }

    let userId: string;
    
    // If user exists, use existing user_id; otherwise create new user
    if (existingUser) {
      userId = existingUser.id;
      
      // Update tenant with existing user_id
      await prisma.tenants.update({
        where: { id: tenant.id },
        data: {
          user_id: userId,
        },
      });

      // Update user metadata to include the new tenant_id
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          tenant_id: tenant.id,
          name: resolvedAdminName,
          role: 'tenant_admin',
          profile_completed: shouldMarkProfileCompleted,
        },
      }).catch((error) => {
        console.error('Failed to update user metadata:', error);
      });
    } else {
      // Create new user in Supabase Auth
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: validatedData.adminEmail,
        password: validatedData.adminPassword!,
        email_confirm: true,
        user_metadata: {
          role: 'tenant_admin',
          tenant_id: tenant.id,
          name: resolvedAdminName,
          profile_completed: validatedData.authProvider === 'email',
        },
      });

      if (authError || !authUser) {
        // Rollback: delete tenant if user creation fails
        await prisma.tenants.delete({
          where: { id: tenant.id },
        });

        return NextResponse.json(
          { message: `Failed to create admin user: ${authError?.message || 'Unknown error'}` },
          { status: 500 }
        );
      }

      userId = authUser.user.id;
      
      // Update tenant with user_id
      await prisma.tenants.update({
        where: { id: tenant.id },
        data: {
          user_id: userId,
        },
      });
    }

    // Initialize store currency settings based on detected country
    try {
      const currencyInfo = getCurrencyForCountry(countryCode);
      await setStaticOptions(tenant.id, {
        currency_code: currencyInfo.code,
        currency_symbol: currencyInfo.symbol,
        currency_symbol_position: currencyInfo.symbolPosition,
        currency_thousand_separator: currencyInfo.thousandSeparator,
        currency_decimal_separator: currencyInfo.decimalSeparator,
        currency_decimal_places: String(currencyInfo.decimalPlaces),
        store_phone: validatedData.adminPhone.trim(),
        ...(validatedData.includeMerchantStore
          ? {
              payment_method: 'tumizi',
              default_payment_method: 'tumizi',
              payment_cash_enabled: 'false',
              payment_mpesa_enabled: 'false',
              payment_tumizi_enabled: 'true',
              payment_timing: 'before_delivery',
            }
          : {}),
      });
      console.log(`[Registration] ✅ Initialized currency settings: ${currencyInfo.code} (${currencyInfo.symbol}) for country ${countryCode}`);
    } catch (currencyError) {
      console.error(`[Registration] ⚠️ Failed to initialize currency settings:`, currencyError);
      // Non-critical - store can still function with default USD
    }

    // Queue Tumizi merchant provisioning in non-blocking mode.
    // Worker maps tenant name / contact_email / store_phone / subdomain → Tumizi Create Merchant
    // (see `provisionSingleTenant` + `create-merchant-defaults`).
    let tumiziProvisioningQueued = false;
    if (
      validatedData.includeMerchantStore &&
      process.env.TUMIZI_BASE_URL &&
      process.env.TUMIZI_PARTNER_API_KEY
    ) {
      try {
        await queueTumiziProvisioningForTenant(tenant.id);
        tumiziProvisioningQueued = true;
      } catch (tumiziQueueError) {
        console.error('[Registration] ⚠️ Failed to queue Tumizi provisioning:', tumiziQueueError);
      }
    }

    // Tenant host, storefront, and login URL for post-registration redirect
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

    let tenantHost: string;
    if (isLocalhost) {
      const url = new URL(baseUrl);
      tenantHost = `${url.protocol}//${tenant.subdomain}.${url.hostname}${url.port ? `:${url.port}` : ''}`;
    } else {
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
      tenantHost = `https://${tenant.subdomain}.${baseDomain}`;
    }

    const loginUrl = `${tenantHost}/dashboard/login`;
    const storeUrl = `${tenantHost}/`;

    // Automatically add subdomain to Vercel
    // IMPORTANT: We await this to ensure domain is added before user tries to access it
    const projectId = process.env.VERCEL_PROJECT_ID;
    if (projectId && !isLocalhost) {
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
      const subdomainUrl = `${tenant.subdomain}.${baseDomain}`;
      try {
        await addTenantDomain(subdomainUrl, projectId);
        console.log(`✅ Successfully added subdomain ${subdomainUrl} to Vercel`);
      } catch (error: any) {
        // Log error but don't fail tenant creation
        // Subdomain can be added manually later if needed
        console.error(`⚠️ Failed to add subdomain ${subdomainUrl} to Vercel:`, error?.message || error);
        // Continue - tenant is still created, just domain needs manual addition
      }
    } else if (!projectId && !isLocalhost) {
      console.warn('VERCEL_PROJECT_ID not set. Subdomain will not be added to Vercel automatically.');
    }

    // Clear any cached tenant data to ensure fresh lookup
    // This is important because the tenant was just created
    try {
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
      const subdomainHostname = `${tenant.subdomain}.${baseDomain}`;
      await clearCachedTenant(subdomainHostname);
      // Also clear by subdomain alone (in case it was cached differently)
      await clearCachedTenant(tenant.subdomain);
    } catch (cacheError) {
      // Non-critical - cache clear failure shouldn't block registration
      console.warn('Failed to clear tenant cache:', cacheError);
    }

    // Track demo content creation for response
    let demoContentCreated = false;
    let demoProductsCreated = 0;
    let demoCategoriesCreated = 0;
    let demoSalesCreated = 0;
    let demoBlogsCreated = 0;
    let demoAttributesCreated = 0;
    let starterPackApplied = false;
    let demoContentQueued = false;
    let onboardingSetupJobId: string | null = null;
    let onboardingSetupStatus: 'none' | 'pending' | 'completed' | 'failed' = 'none';
    let contentSource: 'starter-pack-job-or-api' | 'generic-demo' | 'background-queued' | 'none' = 'none';

    // Install default or selected theme
    if (effectiveThemeId) {
      try {
        console.log(`[Registration] Starting theme installation for tenant ${tenant.subdomain}`, {
          themeId: effectiveThemeId,
          businessType: validatedData.businessType,
          includeDemoContent,
        });

        const theme = await prisma.themes.findUnique({
          where: { id: effectiveThemeId },
        });

        if (!theme) {
          console.error(`[Registration] Theme not found: ${effectiveThemeId}`);
          throw new Error(`Theme not found: ${effectiveThemeId}`);
        }

        console.log(`[Registration] Found theme: ${theme.slug} (${theme.title})`);

        // Start from theme defaults, then prioritize starter-pack theme colors
        // (AI-generated or reused from existing selling starter packs).
        const themeDefaults = getThemeDefaults(theme.slug);
        const starterPackThemeColors = extractThemeColorsFromStarterPack(starterPackPayload);
        const finalColors = {
          ...(themeDefaults?.colors || {}),
          ...starterPackThemeColors,
        };

        // Create tenant theme
        try {
          await prisma.tenant_themes.create({
            data: {
              tenant_id: tenant.id,
              theme_id: theme.id,
              is_active: true,
              custom_colors: finalColors,
              custom_fonts: themeDefaults?.fonts || {},
            },
          });
          console.log(`[Registration] ✅ Created tenant theme for ${theme.slug}`, {
            starterPackThemeColorKeys: Object.keys(starterPackThemeColors),
            usedStarterPackThemeColors: Object.keys(starterPackThemeColors).length > 0,
          });
        } catch (themeCreateError: any) {
          console.error(`[Registration] ❌ Failed to create tenant theme:`, themeCreateError);
          throw themeCreateError;
        }

        // Create homepage
        try {
          // Slug is unique per tenant (tenant_id + slug), so we always use 'home' for the homepage
          const pageSlug = 'home';
          console.log(`[Registration] Checking for existing homepage with slug: ${pageSlug} for tenant: ${tenant.id}`);
          const existingHomepage = await prisma.pages.findFirst({
            where: {
              tenant_id: tenant.id,
              slug: pageSlug,
            },
          });

          if (!existingHomepage) {
            console.log(`[Registration] Homepage does not exist, creating now...`);
            const layoutData = getHomepageLayout(theme.slug);
            const pageTitle = 'Home';

            let pageBuilderData;
            if (layoutData && layoutData.length > 0) {
              console.log(`[Registration] Using legacy layout data for homepage`);
              pageBuilderData = convertLegacyLayoutToPageBuilder(layoutData);
            } else {
              console.log(`[Registration] Using default homepage template with businessType: ${validatedData.businessType || 'none'}`);
              // DA.21: reserve real banner/split-layout section SHELLS now
              // (with the shared onboarding placeholder image, not left out
              // entirely) — the background task later patches these with
              // the real generated images once ready
              // (applyGenericImagesToPageBuilderData requires the sections
              // to already exist to have anything to patch). Always reserved
              // now that the full AI starter pack is disabled for every
              // registration (ENABLE_FULL_AI_STARTER_PACK) — every new store
              // goes through the 5-generic-image path, none through the old
              // real-starter-pack-images patch.
              const nichelessPlaceholderImage = getOnboardingImagePlaceholderUrl();
              const placeholderSections = ENABLE_FULL_AI_STARTER_PACK
                ? undefined
                : {
                    hero: nichelessPlaceholderImage,
                    banners: [nichelessPlaceholderImage, nichelessPlaceholderImage, nichelessPlaceholderImage],
                    splitLayout: nichelessPlaceholderImage,
                  };
              pageBuilderData = createDefaultHomepageTemplate(
                theme.slug,
                tenant.name,
                validatedData.businessType || undefined,
                placeholderSections,
                nicheGiven ? finalSelling : undefined
              );
            }

            pageBuilderData = cleanBlobUrlsFromPageBuilder(pageBuilderData);
            console.log(`[Registration] Homepage data prepared, creating in database...`);

            const createdHomepage = await prisma.pages.create({
              data: {
                tenant_id: tenant.id,
                title: pageTitle,
                slug: pageSlug,
                content: JSON.stringify(pageBuilderData),
                status: 'published',
                banner_image: null,
                meta_title: `${tenant.name} - Home`,
                meta_description: `Welcome to ${tenant.name}. Shop our amazing products and discover great deals.`,
              },
            });
            console.log(`[Registration] ✅ Created homepage successfully:`, {
              id: createdHomepage.id,
              slug: createdHomepage.slug,
              title: createdHomepage.title,
              tenant_id: createdHomepage.tenant_id,
            });
            await persistHomepageInstallSnapshot(tenant.id, pageBuilderData);
            
            // Verify the page was actually saved by querying it back
            const verifyHomepage = await prisma.pages.findUnique({
              where: { id: createdHomepage.id },
              select: { id: true, slug: true, tenant_id: true, title: true },
            });
            if (verifyHomepage) {
              console.log(`[Registration] ✅ Verified homepage exists in database:`, verifyHomepage);
            } else {
              console.error(`[Registration] ❌ WARNING: Homepage was created but cannot be found in database!`);
            }
          } else {
            console.log(`[Registration] ℹ️ Homepage already exists (slug: ${pageSlug}, id: ${existingHomepage.id})`);
          }
        } catch (homepageError: any) {
          console.error(`[Registration] ❌ Failed to create homepage:`, homepageError);
          console.error(`[Registration] Homepage error details:`, {
            message: homepageError.message,
            stack: homepageError.stack,
            code: homepageError.code,
          });
          // Continue - pages are important but not critical for registration
        }

        // Create contact form (always created, not just with demo content)
        let contactFormId: string | undefined;
        try {
          console.log(`[Registration] Creating contact form...`);
          const existingContactForm = await prisma.form_builders.findFirst({
            where: {
              tenant_id: tenant.id,
              slug: 'contact-form',
            },
          });

          if (!existingContactForm) {
            const contactForm = await prisma.form_builders.create({
              data: {
                tenant_id: tenant.id,
                title: 'Contact Form',
                slug: 'contact-form',
                description: 'Get in touch with us using this form',
                email: tenant.contact_email || null,
                button_text: 'Send Message',
                fields: [
                  {
                    id: `field-${Date.now()}-1`,
                    type: 'text',
                    label: 'Name',
                    name: 'name',
                    required: true,
                    placeholder: 'Your full name',
                  },
                  {
                    id: `field-${Date.now()}-2`,
                    type: 'email',
                    label: 'Email',
                    name: 'email',
                    required: true,
                    placeholder: 'your.email@example.com',
                  },
                  {
                    id: `field-${Date.now()}-3`,
                    type: 'text',
                    label: 'Subject',
                    name: 'subject',
                    required: true,
                    placeholder: 'What is this regarding?',
                  },
                  {
                    id: `field-${Date.now()}-4`,
                    type: 'textarea',
                    label: 'Message',
                    name: 'message',
                    required: true,
                    placeholder: 'Tell us how we can help you...',
                  },
                ],
                success_message: 'Thank you for your message! We will get back to you soon.',
                status: 'active',
              },
            });
            contactFormId = contactForm.id;
            console.log(`[Registration] ✅ Created contact form (ID: ${contactFormId})`);
          } else {
            contactFormId = existingContactForm.id;
            console.log(`[Registration] ℹ️ Contact form already exists (ID: ${contactFormId})`);
          }
        } catch (formError: any) {
          console.error(`[Registration] ❌ Failed to create contact form:`, formError);
          // Continue - form creation failure shouldn't block page creation
        }

        // Always create /home, /about, and /contact pages (not /about-us or /contact-us)
        try {
          const tenantName = tenant.name || 'Store';
          const additionalPageTemplates = getAdditionalPageTemplates(tenantName);
          
          // Filter to only include about and contact pages (home is already created above)
          const requiredPages = additionalPageTemplates.filter(
            (page) => page.slug === 'about' || page.slug === 'contact'
          );

          console.log(`[Registration] Creating ${requiredPages.length} additional pages (about, contact)`);

          for (const pageConfig of requiredPages) {
            try {
              const pageSlug = generateSlug(pageConfig.slug || pageConfig.title);
              console.log(`[Registration] Checking for existing page: ${pageConfig.title} (slug: ${pageSlug})`);
              const existingPage = await prisma.pages.findFirst({
                where: {
                  tenant_id: tenant.id,
                  slug: pageSlug,
                },
              });

              if (!existingPage) {
                console.log(`[Registration] Page does not exist, creating: ${pageConfig.title}`);
                // For contact page, pass the contact form ID and contact email
                let pageBuilderData;
                if (pageConfig.slug === 'contact') {
                  console.log(`[Registration] Generating contact page template with form ID: ${contactFormId || 'none'}`);
                  pageBuilderData = pageConfig.templateGenerator(tenantName, contactFormId, tenant.contact_email || undefined);
                } else {
                  pageBuilderData = pageConfig.templateGenerator(tenantName);
                }
                pageBuilderData = cleanBlobUrlsFromPageBuilder(pageBuilderData);

                // Handle global unique constraint on slug
                let createdPage;
                try {
                  // Check if slug exists globally (for any tenant)
                  const globalPageCheck = await prisma.pages.findFirst({
                    where: {
                      slug: pageSlug,
                    },
                    select: {
                      id: true,
                      tenant_id: true,
                    },
                  });

                  if (globalPageCheck && globalPageCheck.tenant_id !== tenant.id) {
                    // Slug exists for another tenant - this is a schema issue
                    // Log error but don't create page with wrong slug
                    console.error(`[Registration] ❌ CRITICAL: Slug '${pageSlug}' already exists for tenant ${globalPageCheck.tenant_id}. Database schema needs @@unique([tenant_id, slug]) constraint.`);
                    throw new Error(`Slug '${pageSlug}' is already in use by another tenant. This indicates a database schema issue - the slug constraint should be per-tenant, not global.`);
                  }

                  // Create the page
                  createdPage = await prisma.pages.create({
                    data: {
                      tenant_id: tenant.id,
                      title: pageConfig.title,
                      slug: pageSlug,
                      content: JSON.stringify(pageBuilderData),
                      status: 'published',
                      banner_image: null,
                      meta_title: pageConfig.metaTitle || null,
                      meta_description: pageConfig.metaDescription || null,
                    },
                  });
                } catch (createError: any) {
                  // If creation fails due to unique constraint, log detailed error
                  if (createError.code === 'P2002' && createError.meta?.target?.includes('slug')) {
                    console.error(`[Registration] ❌ CRITICAL: Unique constraint violation on slug '${pageSlug}'. This indicates the database schema has a global unique constraint on slug instead of per-tenant.`);
                    console.error(`[Registration] Schema should have: @@unique([tenant_id, slug]) instead of: slug @unique`);
                    throw new Error(`Cannot create page with slug '${pageSlug}' - it already exists for another tenant. Database schema needs to be fixed to allow per-tenant unique slugs.`);
                  }
                  throw createError;
                }
                console.log(`[Registration] ✅ Created page successfully:`, {
                  id: createdPage.id,
                  slug: createdPage.slug,
                  title: createdPage.title,
                  tenant_id: createdPage.tenant_id,
                });
                
                // Verify the page was actually saved
                const verifyPage = await prisma.pages.findUnique({
                  where: { id: createdPage.id },
                  select: { id: true, slug: true, tenant_id: true, title: true },
                });
                if (verifyPage) {
                  console.log(`[Registration] ✅ Verified page exists in database:`, verifyPage);
                } else {
                  console.error(`[Registration] ❌ WARNING: Page was created but cannot be found in database!`);
                }
              } else {
                console.log(`[Registration] ℹ️ Page already exists: ${pageConfig.title} (slug: ${pageSlug}, id: ${existingPage.id})`);
              }
            } catch (pageError: any) {
              console.error(`[Registration] ❌ Failed to create page ${pageConfig.title}:`, pageError);
              console.error(`[Registration] Page error details:`, {
                message: pageError.message,
                stack: pageError.stack,
                code: pageError.code,
              });
              // Continue with next page
            }
          }
        } catch (pagesError: any) {
          console.error(`[Registration] ❌ Failed to create additional pages:`, pagesError);
          // Continue - pages are important but not critical for registration
        }

        // Create demo content if requested
        if (includeDemoContent) {
          let appliedFromStarterPack = false;
          if (starterPackPayload) {
            try {
              console.log('[Registration] Applying starter-pack generated content...');
              const starterPackResult = await applyStarterPackToTenant(
                tenant.id,
                starterPackPayload,
                validatedData.businessType,
                finalSelling
              );

              if (starterPackResult.applied) {
                demoContentCreated = true;
                demoProductsCreated = starterPackResult.productsCreated;
                demoCategoriesCreated = starterPackResult.categoriesCreated;
                demoSalesCreated = starterPackResult.salesCreated;
                demoBlogsCreated = starterPackResult.blogsCreated;
                if (validatedData.includeDemoAttributes) {
                  demoAttributesCreated = await createDemoAttributes(
                    prisma,
                    tenant.id,
                    validatedData.businessType || finalSelling || 'General'
                  );
                }
                starterPackApplied = true;
                onboardingSetupStatus = 'completed';
                appliedFromStarterPack = true;
                contentSource = 'starter-pack-job-or-api';
                console.log('[Registration] ✅ Applied starter-pack generated content', {
                  ...starterPackResult,
                  attributesCreated: demoAttributesCreated,
                });

                const starterPackForImages = starterPackPayload;
                const needsImageEnrichment = starterPackNeedsImageEnrichment(starterPackForImages);

                if (needsImageEnrichment && starterPackForImages) {
                  const imageJob = await prisma.cron_job_logs.create({
                    data: {
                      job_name: 'onboarding_tenant_image_enrichment',
                      job_path: '/api/tenants/register',
                      status: 'running',
                      metadata: {
                        traceId: registrationTraceId,
                        tenantId: tenant.id,
                        mode: 'nano-banana-background',
                      } as Prisma.InputJsonValue,
                      result: {} as Prisma.InputJsonValue,
                    },
                    select: { id: true },
                  });

                  onboardingSetupJobId = imageJob.id;
                  onboardingSetupStatus = 'pending';
                  demoContentQueued = true;

                  const setupTenant = await prisma.tenants.findUnique({
                    where: { id: tenant.id },
                    select: { data: true },
                  });
                  const setupTenantData = isRecord(setupTenant?.data) ? setupTenant.data : {};
                  await prisma.tenants.update({
                    where: { id: tenant.id },
                    data: {
                      data: {
                        ...setupTenantData,
                        onboarding_setup: {
                          status: 'pending',
                          jobId: imageJob.id,
                          queuedAt: new Date().toISOString(),
                          estimatedReadyInMinutes: 2,
                          stage: 'images',
                        },
                      } as unknown as Prisma.InputJsonValue,
                    },
                  });

                  after(async () => {
                    const startedAt = Date.now();
                    const repairResult = await triggerOnboardingImageRepair({
                      origin: request.nextUrl.origin,
                      tenantId: tenant.id,
                      traceId: registrationTraceId,
                      reason: 'initial-onboarding-image-population',
                    });

                    const latestTenant = await prisma.tenants.findUnique({
                      where: { id: tenant.id },
                      select: { data: true },
                    });
                    const latestTenantData = isRecord(latestTenant?.data) ? latestTenant.data : {};

                    if (repairResult.success) {
                      await prisma.tenants.update({
                        where: { id: tenant.id },
                        data: {
                          data: {
                            ...latestTenantData,
                            onboarding_setup: {
                              status: 'completed',
                              jobId: imageJob.id,
                              completedAt: new Date().toISOString(),
                              stage: 'images',
                              result: repairResult.data,
                            },
                          } as unknown as Prisma.InputJsonValue,
                        },
                      });

                      await prisma.cron_job_logs.update({
                        where: { id: imageJob.id },
                        data: {
                          status: 'success',
                          completed_at: new Date(),
                          duration_ms: Date.now() - startedAt,
                          result: repairResult.data as Prisma.InputJsonValue,
                          error: null,
                        },
                      });
                      return;
                    }

                    await prisma.tenants.update({
                      where: { id: tenant.id },
                      data: {
                        data: {
                          ...latestTenantData,
                          onboarding_setup: {
                            status: 'failed',
                            jobId: imageJob.id,
                            failedAt: new Date().toISOString(),
                            stage: 'images',
                            error: repairResult.error,
                          },
                        } as unknown as Prisma.InputJsonValue,
                      },
                    });

                    await prisma.cron_job_logs.update({
                      where: { id: imageJob.id },
                      data: {
                        status: 'failed',
                        completed_at: new Date(),
                        duration_ms: Date.now() - startedAt,
                        error: repairResult.error,
                      },
                    });
                  });
                }
              }
            } catch (starterPackApplyError: any) {
              console.error('[Registration] ❌ Failed to apply starter-pack generated content:', starterPackApplyError);
            }
          }

          if (!appliedFromStarterPack) {
            const setupJob = await prisma.cron_job_logs.create({
              data: {
                job_name: 'onboarding_tenant_content_setup',
                job_path: '/api/tenants/register',
                status: 'running',
                metadata: {
                  traceId: registrationTraceId,
                  tenantId: tenant.id,
                  businessType: validatedData.businessType || null,
                  selling: finalSelling || null,
                  includeDemoAttributes: Boolean(validatedData.includeDemoAttributes),
                } as Prisma.InputJsonValue,
                result: {} as Prisma.InputJsonValue,
              },
              select: { id: true },
            });

            onboardingSetupJobId = setupJob.id;
            onboardingSetupStatus = 'pending';
            demoContentQueued = true;
            contentSource = 'background-queued';

            const currentTenant = await prisma.tenants.findUnique({
              where: { id: tenant.id },
              select: { data: true },
            });
            const currentTenantData = isRecord(currentTenant?.data) ? currentTenant.data : {};
            await prisma.tenants.update({
              where: { id: tenant.id },
              data: {
                data: {
                  ...currentTenantData,
                  onboarding_setup: {
                    status: 'pending',
                    jobId: setupJob.id,
                    queuedAt: new Date().toISOString(),
                    estimatedReadyInMinutes: 2,
                  },
                } as unknown as Prisma.InputJsonValue,
              },
            });

            console.log('[Registration] Demo content queued for background setup', {
              traceId: registrationTraceId,
              tenantId: tenant.id,
              jobId: setupJob.id,
            });

            after(async () => {
              const startedAt = Date.now();
              try {
                let backgroundStarterPackPayload: StarterPackPayload | null = null;
                // DA.21: full AI starter pack disabled for every registration — see ENABLE_FULL_AI_STARTER_PACK above.
                if (ENABLE_FULL_AI_STARTER_PACK && validatedData.businessType) {
                  const starterPackResponse = await fetch(`${request.nextUrl.origin}/api/onboarding/starter-pack`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Registration-Trace-Id': registrationTraceId,
                    },
                    body: JSON.stringify({
                      businessType: validatedData.businessType,
                      selling: finalSelling,
                      storeName: validatedData.name,
                      tenantId: tenant.id,
                      variationSeed: tenant.id,
                      themeId: effectiveThemeId,
                      locale: 'en-KE',
                      currency: 'KES',
                      productsCount: 8,
                      categoriesCount: 8,
                      blogPostsCount: 2,
                      includeGeminiCall: true,
                      includeNanoBananaCall: true,
                      checkSellingExists: true,
                      forceExternalGeneration: false,
                      geminiModel: 'gemini-2.5-flash',
                    }),
                  });
                  const starterPackData = await starterPackResponse.json();
                  if (starterPackResponse.ok && starterPackData?.success) {
                    backgroundStarterPackPayload = extractStarterPackPayload(starterPackData);
                  }
                }

                let resultPayload: Record<string, unknown> = {};
                let appliedSource: 'starter-pack-job-or-api' | 'generic-demo' = 'generic-demo';
                // Dedicated, retry-cron-visible marker for the 5 generic
                // homepage images (hero/3 banners/split-layout) — separate
                // from `onboarding_setup` below because that field covers
                // this whole background job (categories/blogs/homepage/
                // images) and getting marked 'completed' even when just the
                // image sub-step silently failed, which is what actually
                // happens today: the retry cron's only signals are
                // `onboarding_setup.stage === 'images'` (never set here) and
                // "tenant has products still on the placeholder" (there are
                // no demo products at all under DA.21), so a failed generic-
                // image call was previously invisible and unretryable. See
                // /api/admin/onboarding/image-retry.
                let homepageGenericImagesStatus: 'succeeded' | 'failed' | null = null;
                let homepageGenericImagesError: string | null = null;

                if (backgroundStarterPackPayload) {
                  if (finalSelling) {
                    const hasCategories =
                      Array.isArray(backgroundStarterPackPayload.categories) &&
                      backgroundStarterPackPayload.categories.length > 0;
                    const hasProducts =
                      Array.isArray(backgroundStarterPackPayload.demoProducts) &&
                      backgroundStarterPackPayload.demoProducts.length > 0;
                    const hasSalesPromotions =
                      Array.isArray(backgroundStarterPackPayload.salesPromotions) &&
                      backgroundStarterPackPayload.salesPromotions.length > 0;
                    if (!hasCategories || !hasProducts || !hasSalesPromotions) {
                      const fallbackPack = buildSellingFallbackStarterPack(finalSelling);
                      backgroundStarterPackPayload = {
                        ...backgroundStarterPackPayload,
                        categories: hasCategories ? backgroundStarterPackPayload.categories : fallbackPack.categories,
                        demoProducts: hasProducts ? backgroundStarterPackPayload.demoProducts : fallbackPack.demoProducts,
                        salesPromotions: hasSalesPromotions
                          ? backgroundStarterPackPayload.salesPromotions
                          : fallbackPack.salesPromotions,
                      };
                    }
                  }

                  const starterPackResult = await applyStarterPackToTenant(
                    tenant.id,
                    backgroundStarterPackPayload,
                    validatedData.businessType,
                    finalSelling
                  );
                  const attributesCreated = validatedData.includeDemoAttributes
                    ? await createDemoAttributes(
                        prisma,
                        tenant.id,
                        validatedData.businessType || finalSelling || 'General'
                      )
                    : 0;
                  appliedSource = 'starter-pack-job-or-api';
                  resultPayload = {
                    source: appliedSource,
                    productsCreated: starterPackResult.productsCreated,
                    categoriesCreated: starterPackResult.categoriesCreated,
                    salesCreated: starterPackResult.salesCreated,
                    blogsCreated: starterPackResult.blogsCreated,
                    attributesCreated,
                  };
                } else if (!ENABLE_FULL_AI_STARTER_PACK) {
                  // DA.21 — full AI starter pack disabled for every
                  // registration: do NOT invent demo products/categories
                  // (per direct user request — "kindly note not to generate
                  // any demo categories and products", later widened to
                  // "stop the 8-product/10-image path entirely" regardless
                  // of niche). Generate exactly 5 generic images instead —
                  // grounded on niche when it was given (nicheGiven, more
                  // relevant imagery), business type otherwise — and bake
                  // them into the already-created homepage. Never a fake
                  // specific product either way.
                  appliedSource = 'generic-demo';
                  let genericImagesApplied = false;
                  try {
                    const genericRes = await fetch(`${request.nextUrl.origin}/api/onboarding/starter-pack`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Registration-Trace-Id': registrationTraceId,
                      },
                      body: JSON.stringify({
                        businessType: validatedData.businessType,
                        niche: nicheGiven ? finalSelling : undefined,
                        tenantId: tenant.id,
                        themeId: effectiveThemeId,
                        genericImagesOnly: true,
                      }),
                    });
                    const genericBody = await genericRes.json().catch(() => ({}));
                    const images = genericBody?.data?.genericImages as
                      | { hero: string | null; banners: string[]; splitLayout: string | null }
                      | undefined;

                    if (genericRes.ok && genericBody?.success && images) {
                      const homePage = await prisma.pages.findFirst({
                        where: { tenant_id: tenant.id, slug: 'home' },
                        select: { id: true, content: true },
                      });
                      if (homePage?.content) {
                        const pageBuilderData = JSON.parse(homePage.content) as {
                          sections?: Array<Record<string, unknown>>;
                        };
                        const updated = applyGenericImagesToPageBuilderData(pageBuilderData, images);
                        await prisma.pages.update({
                          where: { id: homePage.id },
                          data: { content: JSON.stringify(updated) },
                        });
                        genericImagesApplied = true;
                      } else {
                        homepageGenericImagesError = 'Homepage row had no content to patch';
                      }
                    } else {
                      homepageGenericImagesError =
                        genericBody?.error?.message ||
                        `Generic image generation failed (HTTP ${genericRes.status})`;
                      console.warn('[Registration] Generic homepage image generation did not succeed', {
                        traceId: registrationTraceId,
                        tenantId: tenant.id,
                        status: genericRes.status,
                        error: homepageGenericImagesError,
                      });
                    }
                  } catch (genericImagesError) {
                    homepageGenericImagesError =
                      genericImagesError instanceof Error
                        ? genericImagesError.message
                        : 'Unknown generic-images error';
                    console.warn('[Registration] Failed to generate/apply generic homepage images (non-fatal)', {
                      traceId: registrationTraceId,
                      tenantId: tenant.id,
                      error: homepageGenericImagesError,
                    });
                  }
                  homepageGenericImagesStatus = genericImagesApplied ? 'succeeded' : 'failed';
                  resultPayload = {
                    source: appliedSource,
                    productsCreated: 0,
                    categoriesCreated: 0,
                    salesCreated: 0,
                    blogsCreated: 0,
                    attributesCreated: 0,
                    genericImagesApplied,
                  };
                } else {
                  // Unreachable while ENABLE_FULL_AI_STARTER_PACK is false
                  // (the branch above always fires instead) — left intact,
                  // not deleted, in case the flag is ever turned back on.
                  // Originally: "niche WAS given but Gemini genuinely
                  // failed" deterministic fallback.
                  const demoResult = await createDemoContent(
                    prisma,
                    tenant.id,
                    validatedData.businessType || 'Grocery Store / Supermarket',
                    validatedData.includeDemoAttributes || false
                  );
                  resultPayload = {
                    source: appliedSource,
                    productsCreated: demoResult.productsCreated,
                    categoriesCreated: demoResult.categoriesCreated,
                    salesCreated: demoResult.salesCreated ?? 0,
                    blogsCreated: demoResult.blogsCreated ?? 0,
                    attributesCreated: demoResult.attributesCreated ?? 0,
                  };
                }

                const imageRepairResult = await triggerOnboardingImageRepair({
                  origin: request.nextUrl.origin,
                  tenantId: tenant.id,
                  traceId: registrationTraceId,
                  reason: `post-content-setup:${appliedSource}`,
                });
                resultPayload = {
                  ...resultPayload,
                  imageRepair: imageRepairResult.success
                    ? {
                        success: true,
                        ...imageRepairResult.data,
                      }
                    : {
                        success: false,
                        status: imageRepairResult.status ?? null,
                        error: imageRepairResult.error,
                      },
                };

                const latestTenant = await prisma.tenants.findUnique({
                  where: { id: tenant.id },
                  select: { data: true },
                });
                const latestTenantData = isRecord(latestTenant?.data) ? latestTenant.data : {};
                await prisma.tenants.update({
                  where: { id: tenant.id },
                  data: {
                    data: {
                      ...latestTenantData,
                      onboarding_setup: {
                        status: 'completed',
                        jobId: setupJob.id,
                        completedAt: new Date().toISOString(),
                        result: resultPayload,
                      },
                      ...(homepageGenericImagesStatus
                        ? {
                            homepage_generic_images: {
                              status: homepageGenericImagesStatus,
                              error: homepageGenericImagesError,
                              attemptedAt: new Date().toISOString(),
                            },
                          }
                        : {}),
                    } as unknown as Prisma.InputJsonValue,
                  },
                });

                await prisma.cron_job_logs.update({
                  where: { id: setupJob.id },
                  data: {
                    status: 'success',
                    completed_at: new Date(),
                    duration_ms: Date.now() - startedAt,
                    result: resultPayload as Prisma.InputJsonValue,
                  },
                });
              } catch (backgroundError) {
                const latestTenant = await prisma.tenants.findUnique({
                  where: { id: tenant.id },
                  select: { data: true },
                });
                const latestTenantData = isRecord(latestTenant?.data) ? latestTenant.data : {};
                await prisma.tenants.update({
                  where: { id: tenant.id },
                  data: {
                    data: {
                      ...latestTenantData,
                      onboarding_setup: {
                        status: 'failed',
                        jobId: setupJob.id,
                        failedAt: new Date().toISOString(),
                        error: backgroundError instanceof Error ? backgroundError.message : 'Unknown setup error',
                      },
                    } as unknown as Prisma.InputJsonValue,
                  },
                });

                await prisma.cron_job_logs.update({
                  where: { id: setupJob.id },
                  data: {
                    status: 'failed',
                    completed_at: new Date(),
                    duration_ms: Date.now() - startedAt,
                    error: backgroundError instanceof Error ? backgroundError.message : 'Unknown setup error',
                  },
                });
              }
            });
          }
        } else {
          console.log(`[Registration] Demo content not requested (includeDemoContent: false)`);
        }

        console.log(`[Registration] ✅ Successfully installed theme ${theme.slug} for tenant ${tenant.subdomain}`);
        
        // Double-check that required pages exist (in case they weren't created during theme installation)
        try {
          console.log(`[Registration] Verifying required pages exist...`);
          const tenantName = tenant.name || 'Store';
          const requiredSlugs = ['home', 'about', 'contact'];
          
          for (const slug of requiredSlugs) {
            const pageSlug = generateSlug(slug);
            const existingPage = await prisma.pages.findFirst({
              where: {
                tenant_id: tenant.id,
                slug: pageSlug,
              },
            });
            
            if (!existingPage) {
              console.log(`[Registration] ⚠️ Required page missing: ${slug}, creating now...`);
              
              if (slug === 'home') {
                // Create homepage
                const homePageBuilderData = createDefaultHomepageTemplate(
                  theme.slug,
                  tenantName,
                  validatedData.businessType || undefined,
                  undefined,
                  nicheGiven ? finalSelling : undefined
                );
                const cleanedHomePageData = cleanBlobUrlsFromPageBuilder(homePageBuilderData);

                await prisma.pages.create({
                  data: {
                    tenant_id: tenant.id,
                    title: 'Home',
                    slug: pageSlug,
                    content: JSON.stringify(cleanedHomePageData),
                    status: 'published',
                    banner_image: null,
                    meta_title: `${tenantName} - Home`,
                    meta_description: `Welcome to ${tenantName}. Shop our amazing products and discover great deals.`,
                  },
                });
                console.log(`[Registration] ✅ Created missing homepage (slug: ${pageSlug})`);
              } else {
                // Create about or contact page
                const additionalPageTemplates = getAdditionalPageTemplates(tenantName);
                const pageConfig = additionalPageTemplates.find(p => p.slug === slug);
                
                if (pageConfig) {
                  let pageBuilderData;
                  if (slug === 'contact') {
                    // Get or create contact form
                    let contactFormId: string | undefined;
                    const existingContactForm = await prisma.form_builders.findFirst({
                      where: {
                        tenant_id: tenant.id,
                        slug: 'contact-form',
                      },
                    });
                    if (existingContactForm) {
                      contactFormId = existingContactForm.id;
                    }
                    pageBuilderData = pageConfig.templateGenerator(tenantName, contactFormId, tenant.contact_email || undefined);
                  } else {
                    pageBuilderData = pageConfig.templateGenerator(tenantName);
                  }
                  pageBuilderData = cleanBlobUrlsFromPageBuilder(pageBuilderData);
                  
                  await prisma.pages.create({
                    data: {
                      tenant_id: tenant.id,
                      title: pageConfig.title,
                      slug: pageSlug,
                      content: JSON.stringify(pageBuilderData),
                      status: 'published',
                      banner_image: null,
                      meta_title: pageConfig.metaTitle || null,
                      meta_description: pageConfig.metaDescription || null,
                    },
                  });
                  console.log(`[Registration] ✅ Created missing page: ${pageConfig.title} (slug: ${pageSlug})`);
                }
              }
            }
          }
        } catch (verifyError: any) {
          console.error(`[Registration] ❌ Error verifying/creating required pages:`, verifyError);
          // Don't throw - registration should still succeed
        }
      } catch (themeError: any) {
        console.error(`[Registration] ❌ Failed to install theme:`, themeError);
        console.error(`[Registration] Theme installation error details:`, {
          message: themeError.message,
          stack: themeError.stack,
          themeId: effectiveThemeId,
        });
        // Non-critical - theme installation failure shouldn't block registration
        // But try to create default pages anyway
        try {
          console.log(`[Registration] Attempting to create default pages after theme installation failure...`);
          
          // Create contact form for fallback pages
          let fallbackContactFormId: string | undefined;
          try {
            const existingContactForm = await prisma.form_builders.findFirst({
              where: {
                tenant_id: tenant.id,
                slug: 'contact-form',
              },
            });

            if (!existingContactForm) {
              const contactForm = await prisma.form_builders.create({
                data: {
                  tenant_id: tenant.id,
                  title: 'Contact Form',
                  slug: 'contact-form',
                  description: 'Get in touch with us using this form',
                  email: tenant.contact_email || null,
                  button_text: 'Send Message',
                  fields: [
                    {
                      id: `field-${Date.now()}-1`,
                      type: 'text',
                      label: 'Name',
                      name: 'name',
                      required: true,
                      placeholder: 'Your full name',
                    },
                    {
                      id: `field-${Date.now()}-2`,
                      type: 'email',
                      label: 'Email',
                      name: 'email',
                      required: true,
                      placeholder: 'your.email@example.com',
                    },
                    {
                      id: `field-${Date.now()}-3`,
                      type: 'text',
                      label: 'Subject',
                      name: 'subject',
                      required: true,
                      placeholder: 'What is this regarding?',
                    },
                    {
                      id: `field-${Date.now()}-4`,
                      type: 'textarea',
                      label: 'Message',
                      name: 'message',
                      required: true,
                      placeholder: 'Tell us how we can help you...',
                    },
                  ],
                  success_message: 'Thank you for your message! We will get back to you soon.',
                  status: 'active',
                },
              });
              fallbackContactFormId = contactForm.id;
            } else {
              fallbackContactFormId = existingContactForm.id;
            }
          } catch (formError) {
            console.error(`[Registration] ❌ Failed to create fallback contact form:`, formError);
          }
          
          const tenantName = tenant.name || 'Store';
          
          // Create homepage first
          try {
            const homePageSlug = generateSlug('home');
            const existingHomepage = await prisma.pages.findFirst({
              where: {
                tenant_id: tenant.id,
                slug: homePageSlug,
              },
            });

            if (!existingHomepage) {
              const homePageBuilderData = createDefaultHomepageTemplate(
                'grocery',
                tenantName,
                validatedData.businessType || undefined,
                undefined,
                nicheGiven ? finalSelling : undefined
              );
              const cleanedHomePageData = cleanBlobUrlsFromPageBuilder(homePageBuilderData);

              await prisma.pages.create({
                data: {
                  tenant_id: tenant.id,
                  title: 'Home',
                  slug: homePageSlug,
                  content: JSON.stringify(cleanedHomePageData),
                  status: 'published',
                  banner_image: null,
                  meta_title: `${tenantName} - Home`,
                  meta_description: `Welcome to ${tenantName}. Shop our amazing products and discover great deals.`,
                },
              });
              console.log(`[Registration] ✅ Created fallback homepage (slug: ${homePageSlug})`);
            }
          } catch (homeError: any) {
            console.error(`[Registration] ❌ Failed to create fallback homepage:`, homeError);
          }
          
          // Create about and contact pages
          const additionalPageTemplates = getAdditionalPageTemplates(tenantName);
          const requiredPages = additionalPageTemplates.filter(
            (page) => page.slug === 'about' || page.slug === 'contact'
          );

          for (const pageConfig of requiredPages) {
            try {
              const pageSlug = generateSlug(pageConfig.slug || pageConfig.title);
              const existingPage = await prisma.pages.findFirst({
                where: {
                  tenant_id: tenant.id,
                  slug: pageSlug,
                },
              });

              if (!existingPage) {
                // For contact page, pass the contact form ID and contact email
                let pageBuilderData;
                if (pageConfig.slug === 'contact') {
                  pageBuilderData = pageConfig.templateGenerator(tenantName, fallbackContactFormId, tenant.contact_email || undefined);
                } else {
                  pageBuilderData = pageConfig.templateGenerator(tenantName);
                }
                pageBuilderData = cleanBlobUrlsFromPageBuilder(pageBuilderData);

                await prisma.pages.create({
                  data: {
                    tenant_id: tenant.id,
                    title: pageConfig.title,
                    slug: pageSlug,
                    content: JSON.stringify(pageBuilderData),
                    status: 'published',
                    banner_image: null,
                    meta_title: pageConfig.metaTitle || null,
                    meta_description: pageConfig.metaDescription || null,
                  },
                });
                console.log(`[Registration] ✅ Created fallback page: ${pageConfig.title} (slug: ${pageSlug})`);
              }
            } catch (pageError: any) {
              console.error(`[Registration] ❌ Failed to create fallback page ${pageConfig.title}:`, pageError);
            }
          }
        } catch (fallbackError: any) {
          console.error(`[Registration] ❌ Failed to create fallback pages:`, fallbackError);
        }
      }
    } else {
      // Create a default homepage if no theme is selected
      try {
        const existingHomepage = await prisma.pages.findFirst({
          where: {
            tenant_id: tenant.id,
            slug: 'home',
          },
        });

        if (!existingHomepage) {
          await prisma.pages.create({
            data: {
              tenant_id: tenant.id,
              title: 'Home',
              slug: 'home',
              content: JSON.stringify({
                sections: [
                  {
                    id: 'hero-1',
                    type: 'hero',
                    title: `Welcome to ${tenant.name}`,
                    subtitle: 'Discover amazing products at great prices',
                    ctaText: 'Shop Now',
                    ctaLink: '/shop',
                    layout: 'center',
                  },
                  {
                    id: 'featured-1',
                    type: 'featured-products',
                    title: 'Featured Products',
                    subtitle: 'Check out our top picks',
                    limit: 8,
                  },
                ],
              }),
              status: 'published',
              meta_title: `${tenant.name} - Home`,
              meta_description: `Welcome to ${tenant.name}. Discover amazing products and great deals.`,
            },
          });

          // Create contact form for pages (even without theme)
          let noThemeContactFormId: string | undefined;
          try {
            const existingContactForm = await prisma.form_builders.findFirst({
              where: {
                tenant_id: tenant.id,
                slug: 'contact-form',
              },
            });

            if (!existingContactForm) {
              const contactForm = await prisma.form_builders.create({
                data: {
                  tenant_id: tenant.id,
                  title: 'Contact Form',
                  slug: 'contact-form',
                  description: 'Get in touch with us using this form',
                  email: tenant.contact_email || null,
                  button_text: 'Send Message',
                  fields: [
                    {
                      id: `field-${Date.now()}-1`,
                      type: 'text',
                      label: 'Name',
                      name: 'name',
                      required: true,
                      placeholder: 'Your full name',
                    },
                    {
                      id: `field-${Date.now()}-2`,
                      type: 'email',
                      label: 'Email',
                      name: 'email',
                      required: true,
                      placeholder: 'your.email@example.com',
                    },
                    {
                      id: `field-${Date.now()}-3`,
                      type: 'text',
                      label: 'Subject',
                      name: 'subject',
                      required: true,
                      placeholder: 'What is this regarding?',
                    },
                    {
                      id: `field-${Date.now()}-4`,
                      type: 'textarea',
                      label: 'Message',
                      name: 'message',
                      required: true,
                      placeholder: 'Tell us how we can help you...',
                    },
                  ],
                  success_message: 'Thank you for your message! We will get back to you soon.',
                  status: 'active',
                },
              });
              noThemeContactFormId = contactForm.id;
            } else {
              noThemeContactFormId = existingContactForm.id;
            }
          } catch (formError) {
            console.error(`[Registration] ❌ Failed to create contact form:`, formError);
          }

          // Always create /about and /contact pages even without theme
          const tenantName = tenant.name || 'Store';
          const additionalPageTemplates = getAdditionalPageTemplates(tenantName);
          const requiredPages = additionalPageTemplates.filter(
            (page) => page.slug === 'about' || page.slug === 'contact'
          );

          for (const pageConfig of requiredPages) {
            const pageSlug = generateSlug(pageConfig.slug || pageConfig.title);
            const existingPage = await prisma.pages.findFirst({
              where: {
                tenant_id: tenant.id,
                slug: pageSlug,
              },
            });

            if (!existingPage) {
              // For contact page, pass the contact form ID and contact email
              let pageBuilderData;
              if (pageConfig.slug === 'contact') {
                pageBuilderData = pageConfig.templateGenerator(tenantName, noThemeContactFormId, tenant.contact_email || undefined);
              } else {
                pageBuilderData = pageConfig.templateGenerator(tenantName);
              }
              pageBuilderData = cleanBlobUrlsFromPageBuilder(pageBuilderData);

              await prisma.pages.create({
                data: {
                  tenant_id: tenant.id,
                  title: pageConfig.title,
                  slug: pageSlug,
                  content: JSON.stringify(pageBuilderData),
                  status: 'published',
                  banner_image: null,
                  meta_title: pageConfig.metaTitle || null,
                  meta_description: pageConfig.metaDescription || null,
                },
              });
            }
          }

          console.log(`✅ Created default homepage and pages for tenant ${tenant.subdomain}`);
        }
      } catch (homepageError) {
        console.warn('Failed to create default homepage:', homepageError);
      }
    }

    // Send Day 1 onboarding email (non-blocking)
    const { sendTenantOnboardingEmail } = await import('@/lib/onboarding/emails');
    void sendTenantOnboardingEmail({
      to: validatedData.adminEmail,
      tenantId: tenant.id,
      tenant: {
        name: tenant.name,
        subdomain: tenant.subdomain,
        custom_domain: tenant.custom_domain,
      },
      stage: 'day1',
    })
      .then(async () => {
        try {
          const tenantData = (tenant.data as any) || {};
          const onboardingEmails = tenantData.onboarding_emails || {};
          await prisma.tenants.update({
            where: { id: tenant.id },
            data: {
              data: {
                ...tenantData,
                onboarding_emails: {
                  ...onboardingEmails,
                  onboarding_started_at: onboardingEmails.onboarding_started_at || new Date().toISOString(),
                  day1_sent_at: new Date().toISOString(),
                },
              },
            },
          });
        } catch (updateError) {
          console.error('[Registration] Failed to persist onboarding email metadata:', updateError);
        }
      })
      .catch((error) => {
        console.error('[Registration] Failed to send Day 1 onboarding email:', error);
      });

    const { sendRegistrationSms } = await import('@/lib/sms/tenant-notifications');
    console.log('[Registration][SMS] Scheduling welcome SMS (async)', {
      traceId: registrationTraceId,
      tenantId: tenant.id,
    });
    void sendRegistrationSms({
      tenantId: tenant.id,
      adminPhoneE164: normalizedAdminPhoneE164,
      storeName: tenant.name,
      storeUrl,
    })
      .then((success) => {
        console.log('[Registration][SMS] Welcome SMS promise settled', {
          traceId: registrationTraceId,
          tenantId: tenant.id,
          success,
        });
      })
      .catch((error) => {
        console.error('[Registration][SMS] Welcome SMS rejected', {
          traceId: registrationTraceId,
          tenantId: tenant.id,
          error: error instanceof Error ? error.message : error,
        });
      });

    // Return success response
    // Final verification: Ensure all required pages exist before returning success
    try {
      console.log(`[Registration] Performing final verification of required pages...`);
      const tenantName = tenant.name || 'Store';
      const requiredSlugs = ['home', 'about', 'contact'];
      let pagesCreated = 0;
      
      // Get or create contact form for contact page
      let finalContactFormId: string | undefined;
      const existingContactForm = await prisma.form_builders.findFirst({
        where: {
          tenant_id: tenant.id,
          slug: 'contact-form',
        },
      });
      if (existingContactForm) {
        finalContactFormId = existingContactForm.id;
      } else {
        // Create contact form if it doesn't exist
        try {
          const contactForm = await prisma.form_builders.create({
            data: {
              tenant_id: tenant.id,
              title: 'Contact Form',
              slug: 'contact-form',
              description: 'Get in touch with us using this form',
              email: tenant.contact_email || null,
              button_text: 'Send Message',
              fields: [
                {
                  id: `field-${Date.now()}-1`,
                  type: 'text',
                  label: 'Name',
                  name: 'name',
                  required: true,
                  placeholder: 'Your full name',
                },
                {
                  id: `field-${Date.now()}-2`,
                  type: 'email',
                  label: 'Email',
                  name: 'email',
                  required: true,
                  placeholder: 'your.email@example.com',
                },
                {
                  id: `field-${Date.now()}-3`,
                  type: 'text',
                  label: 'Subject',
                  name: 'subject',
                  required: true,
                  placeholder: 'What is this regarding?',
                },
                {
                  id: `field-${Date.now()}-4`,
                  type: 'textarea',
                  label: 'Message',
                  name: 'message',
                  required: true,
                  placeholder: 'Tell us how we can help you...',
                },
              ],
              success_message: 'Thank you for your message! We will get back to you soon.',
              status: 'active',
            },
          });
          finalContactFormId = contactForm.id;
          console.log(`[Registration] ✅ Created contact form in final verification (ID: ${finalContactFormId})`);
        } catch (formError: any) {
          console.error(`[Registration] ❌ Failed to create contact form in final verification:`, formError);
        }
      }
      
      for (const slug of requiredSlugs) {
        try {
          const pageSlug = generateSlug(slug);
          const existingPage = await prisma.pages.findFirst({
            where: {
              tenant_id: tenant.id,
              slug: pageSlug,
            },
          });
          
          if (!existingPage) {
            console.log(`[Registration] ⚠️ Required page missing in final check: ${slug}, creating now...`);
            
            if (slug === 'home') {
              // Create homepage with business-specific content
              let themeSlug = 'grocery'; // Default to grocery theme
              if (effectiveThemeId) {
                try {
                  const theme = await prisma.themes.findUnique({ 
                    where: { id: effectiveThemeId }, 
                    select: { slug: true } 
                  });
                  if (theme) {
                    themeSlug = theme.slug;
                  }
                } catch (themeError) {
                  console.error(`[Registration] Error fetching theme for homepage:`, themeError);
                  // Use default 'grocery'
                }
              }
              const homePageBuilderData = createDefaultHomepageTemplate(
                themeSlug,
                tenantName,
                validatedData.businessType || undefined,
                undefined,
                nicheGiven ? finalSelling : undefined
              );
              const cleanedHomePageData = cleanBlobUrlsFromPageBuilder(homePageBuilderData);
              
              // Handle global unique constraint on slug
              try {
                // Check if slug exists globally (for any tenant)
                const globalPageCheck = await prisma.pages.findFirst({
                  where: {
                    slug: pageSlug,
                  },
                  select: {
                    id: true,
                    tenant_id: true,
                  },
                });

                if (globalPageCheck && globalPageCheck.tenant_id !== tenant.id) {
                  console.error(`[Registration] ❌ CRITICAL: Slug '${pageSlug}' already exists for tenant ${globalPageCheck.tenant_id}. Database schema needs @@unique([tenant_id, slug]) constraint.`);
                  throw new Error(`Slug '${pageSlug}' is already in use by another tenant. Database schema issue.`);
                }

                await prisma.pages.create({
                  data: {
                    tenant_id: tenant.id,
                    title: 'Home',
                    slug: pageSlug,
                    content: JSON.stringify(cleanedHomePageData),
                    status: 'published',
                    banner_image: null,
                    meta_title: `${tenantName} - Home`,
                    meta_description: `Welcome to ${tenantName}. Shop our amazing products and discover great deals.`,
                  },
                });
                pagesCreated++;
                console.log(`[Registration] ✅ Created missing homepage in final verification (slug: ${pageSlug})`);
              } catch (createError: any) {
                if (createError.code === 'P2002' && createError.meta?.target?.includes('slug')) {
                  console.error(`[Registration] ❌ CRITICAL: Unique constraint violation on slug '${pageSlug}'. Database schema has global unique constraint instead of per-tenant.`);
                  console.error(`[Registration] Schema should have: @@unique([tenant_id, slug]) instead of: slug @unique`);
                }
                throw createError;
              }
            } else {
              // Create about or contact page
              const additionalPageTemplates = getAdditionalPageTemplates(tenantName);
              const pageConfig = additionalPageTemplates.find(p => p.slug === slug);
              
              if (pageConfig) {
                let pageBuilderData;
                if (slug === 'contact') {
                  pageBuilderData = pageConfig.templateGenerator(tenantName, finalContactFormId, tenant.contact_email || undefined);
                } else {
                  pageBuilderData = pageConfig.templateGenerator(tenantName);
                }
                pageBuilderData = cleanBlobUrlsFromPageBuilder(pageBuilderData);
                
                // Handle global unique constraint on slug
                try {
                  // Check if slug exists globally (for any tenant)
                  const globalPageCheck = await prisma.pages.findFirst({
                    where: {
                      slug: pageSlug,
                    },
                    select: {
                      id: true,
                      tenant_id: true,
                    },
                  });

                  if (globalPageCheck && globalPageCheck.tenant_id !== tenant.id) {
                    console.error(`[Registration] ❌ CRITICAL: Slug '${pageSlug}' already exists for tenant ${globalPageCheck.tenant_id}. Database schema needs @@unique([tenant_id, slug]) constraint.`);
                    throw new Error(`Slug '${pageSlug}' is already in use by another tenant. Database schema issue.`);
                  }

                  await prisma.pages.create({
                    data: {
                      tenant_id: tenant.id,
                      title: pageConfig.title,
                      slug: pageSlug,
                      content: JSON.stringify(pageBuilderData),
                      status: 'published',
                      banner_image: null,
                      meta_title: pageConfig.metaTitle || null,
                      meta_description: pageConfig.metaDescription || null,
                    },
                  });
                  pagesCreated++;
                  console.log(`[Registration] ✅ Created missing page in final verification: ${pageConfig.title} (slug: ${pageSlug})`);
                } catch (createError: any) {
                  if (createError.code === 'P2002' && createError.meta?.target?.includes('slug')) {
                    console.error(`[Registration] ❌ CRITICAL: Unique constraint violation on slug '${pageSlug}'. Database schema has global unique constraint instead of per-tenant.`);
                    console.error(`[Registration] Schema should have: @@unique([tenant_id, slug]) instead of: slug @unique`);
                  }
                  throw createError;
                }
              }
            }
          } else {
            console.log(`[Registration] ✅ Verified page exists: ${slug} (slug: ${pageSlug})`);
          }
        } catch (pageError: any) {
          console.error(`[Registration] ❌ Failed to create/verify page ${slug} in final check:`, pageError);
        }
      }
      
      if (pagesCreated > 0) {
        console.log(`[Registration] ✅ Created ${pagesCreated} missing page(s) in final verification`);
      } else {
        console.log(`[Registration] ✅ All required pages verified and exist`);
      }
      
      // Final database verification - query all pages for this tenant
      try {
        const allPagesForTenant = await prisma.pages.findMany({
          where: {
            tenant_id: tenant.id,
          },
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            created_at: true,
          },
          orderBy: {
            created_at: 'asc',
          },
        });
        
        console.log(`[Registration] 📋 Final database check - Pages for tenant ${tenant.id} (${tenant.subdomain}):`, {
          totalPages: allPagesForTenant.length,
          pages: allPagesForTenant.map(p => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            status: p.status,
            created: p.created_at,
          })),
        });
        
        // Verify required pages exist
        const foundSlugs = allPagesForTenant.map(p => p.slug?.toLowerCase()).filter(Boolean);
        const missingRequired = requiredSlugs.filter(slug => !foundSlugs.includes(slug.toLowerCase()));
        
        if (missingRequired.length > 0) {
          console.error(`[Registration] ⚠️ WARNING: Required pages still missing after all attempts:`, missingRequired);
          console.error(`[Registration] Found slugs:`, foundSlugs);
        } else {
          console.log(`[Registration] ✅ All required pages confirmed in database`);
        }
      } catch (dbCheckError: any) {
        console.error(`[Registration] ❌ Error in final database check:`, dbCheckError);
      }
    } catch (verifyError: any) {
      console.error(`[Registration] ❌ Error in final page verification:`, verifyError);
      // Don't fail registration - pages might still exist
    }

    return NextResponse.json({
      success: true,
      message: 'Tenant registered successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
      },
      loginUrl,
      demoContentCreated,
      demoProductsCreated,
      demoCategoriesCreated,
      demoSalesCreated,
      demoBlogsCreated,
      demoAttributesCreated,
      demoContentQueued,
      onboardingSetupJobId,
      onboardingSetupStatus,
      starterPackApplied,
      tumiziProvisioningQueued,
      debugTraceId: registrationTraceId,
      contentSource,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Tenant registration error:', {
      traceId: registrationTraceId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          message: 'Validation failed',
          errors: error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'An error occurred during registration. Please try again.'
      },
      { status: 500 }
    );
  }
}

