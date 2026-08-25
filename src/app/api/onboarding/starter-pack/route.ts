import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@prisma/client';
import { getThemeDefaults } from '@/lib/themes/theme-defaults';
import { getThemeColorSettingsWithDefaults } from '@/lib/themes/color-settings';
import { buildSellingMatchKeys, checkSellingExists, isSellingEquivalent, normalizeSellingKey } from '@/lib/onboarding/selling-check';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { recordAiUsage } from '@/lib/ai/usage';
import { estimateGeminiTextCostUsd } from '@/lib/ai/gemini-cost';
import {
  DEFAULT_GEMINI_IMAGE_MODEL,
  GEMINI_IMAGE_FALLBACK_MODELS,
  withImageNegativePrompt,
  buildNanoBananaJobs,
  buildGenericHomepageImageJobs,
  executeNanoBananaJobs,
  type NanoBananaJob,
} from '@/lib/onboarding/nano-banana-jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODELS = ['gemini-1.5-flash'];

const starterPackRequestSchema = z.object({
  businessType: z.string().min(1, 'businessType is required'),
  selling: z.string().optional(),
  niche: z.string().optional(),
  storeName: z.string().optional(),
  tenantId: z.string().optional(),
  variationSeed: z.string().optional(),
  themeId: z.string().uuid().optional(),
  themeSlug: z.string().min(1).optional(),
  locale: z.string().default('en-KE'),
  currency: z.string().default('KES'),
  productsCount: z.number().int().min(1).max(20).default(8),
  categoriesCount: z.number().int().min(1).max(12).default(8),
  blogPostsCount: z.number().int().min(1).max(6).default(2),
  includeGeminiCall: z.boolean().default(false),
  includeNanoBananaCall: z.boolean().default(true),
  checkSellingExists: z.boolean().default(true),
  forceExternalGeneration: z.boolean().default(false),
  geminiModel: z.string().default(DEFAULT_GEMINI_MODEL),
  geminiResult: z.unknown().optional(),
  /**
   * When true, skips the full demoProducts/categories/salesPromotions
   * generation entirely and instead generates exactly 5 generic,
   * business-type-flavored images (hero, 3 banners, split-layout) — no
   * fake products or categories are invented. Requested directly by the
   * user for registrations where the merchant never said what they're
   * selling (niche is empty) — inventing 8 specific demo products from
   * business type alone ("Retail") reads as arbitrary/generic, whereas a
   * few tasteful generic images plus an empty catalog honestly signals
   * "add your own products" (which the assistant's product_intake/photo-QA
   * features, already built this session, exist to help with). See
   * docs/IMPLEMENTATION_TRACKER.md DA.21.
   */
  genericImagesOnly: z.boolean().default(false),
});

const generatedProductSchema = z.object({
  name: z.string(),
  priceKES: z.number(),
  description: z.string(),
  imagePrompt: z.string().optional(),
  nanoBananaPrompt: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

const generatedSalesPromotionSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  ctaText: z.string(),
  imagePrompt: z.string().optional(),
  nanoBananaPrompt: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

const generatedStarterPackSchema = z.object({
  themeConfig: z.record(z.string(), z.object({
    hex: z.string(),
    description: z.string(),
  })).optional(),
  copy: z.object({
    headline: z.string(),
    subheadline: z.string(),
    ctaText: z.string(),
  }),
  categories: z.array(z.string()),
  demoProducts: z.array(generatedProductSchema),
  salesPromotions: z.array(generatedSalesPromotionSchema).length(2),
  blogPosts: z.array(z.object({
    title: z.string(),
    summary: z.string().optional().default(''),
  })),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeHexColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  const sixDigit = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
  if (sixDigit) {
    return `#${sixDigit[1]}`;
  }
  const threeDigit = trimmed.match(/^#?([0-9a-fA-F]{3})$/);
  if (threeDigit) {
    const expanded = threeDigit[1]
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
    return `#${expanded}`;
  }
  return undefined;
}

function normalizeThemeColorKey(rawKey: string): string {
  const key = rawKey.toLowerCase().replace(/[\s_-]/g, '');
  const mapping: Record<string, string> = {
    primary: 'primary',
    secondary: 'secondary',
    accent: 'accent',
    background: 'background',
    text: 'text',
    muted: 'muted',
    buttonbackground: 'buttonBackground',
    buttonbg: 'buttonBackground',
    buttontext: 'buttonText',
    buttonforeground: 'buttonText',
  };
  return mapping[key] || rawKey;
}

function getThemeHexMapFromConfig(
  themeConfig: Record<string, { hex: string; description: string }> | undefined
): Record<string, string> {
  if (!themeConfig) return {};
  return Object.entries(themeConfig).reduce<Record<string, string>>((acc, [key, value]) => {
    const normalizedKey = normalizeThemeColorKey(key);
    const normalizedHex = normalizeHexColor(value?.hex);
    if (normalizedHex) {
      acc[normalizedKey] = normalizedHex.toUpperCase();
    }
    return acc;
  }, {});
}

function getThemeHexMapFromSettings(
  themeColorSettings: ReturnType<typeof getThemeColorSettingsWithDefaults>
): Record<string, string> {
  return themeColorSettings.reduce<Record<string, string>>((acc, item) => {
    const normalizedHex = normalizeHexColor(item.defaultHex);
    if (normalizedHex) {
      acc[item.key] = normalizedHex.toUpperCase();
    }
    return acc;
  }, {});
}

function hasThemeVariationFromDefaults(
  themeConfig: Record<string, { hex: string; description: string }> | undefined,
  themeColorSettings: ReturnType<typeof getThemeColorSettingsWithDefaults>
): boolean {
  const configHexes = getThemeHexMapFromConfig(themeConfig);
  const defaultHexes = getThemeHexMapFromSettings(themeColorSettings);
  const keysToCompare = ['primary', 'secondary', 'accent', 'buttonBackground'];

  if (Object.keys(configHexes).length === 0) return false;

  return keysToCompare.some((key) => {
    const configHex = configHexes[key];
    const defaultHex = defaultHexes[key];
    return Boolean(configHex && defaultHex && configHex !== defaultHex);
  });
}

function buildThemeOnlyPrompt(input: {
  businessType: string;
  niche: string;
  themeColorSettings: ReturnType<typeof getThemeColorSettingsWithDefaults>;
}) {
  const settingsLines = input.themeColorSettings
    .map((item) => `- ${item.key}: ${item.defaultHex} (${item.description})`)
    .join('\n');

  return [
    `Generate ONLY "themeConfig" JSON for business type "${input.businessType}" and niche "${input.niche}".`,
    'Return exactly: { "themeConfig": { "<key>": { "hex": "#RRGGBB", "description": "..." } } }',
    'Include all required keys: primary, secondary, accent, background, text, muted, buttonBackground, buttonText.',
    'Create a niche-specific palette. Do NOT simply copy all provided default hex values.',
    'Maintain good contrast and readable ecommerce UI.',
    'Use these existing theme key descriptions:',
    settingsLines,
  ].join('\n');
}

function normalizeGeneratedStarterPack(
  raw: unknown,
  input: { niche: string; categoriesCount: number; productsCount: number; blogPostsCount: number }
) {
  const source = isRecord(raw) ? raw : {};
  const copySource = isRecord(source.copy) ? source.copy : {};

  const copy = {
    headline:
      toStringValue(copySource.headline) ||
      toStringValue((source as Record<string, unknown>).headline) ||
      `Fresh ${input.niche} for Every Occasion`,
    subheadline:
      toStringValue(copySource.subheadline) ||
      toStringValue((source as Record<string, unknown>).subheadline) ||
      `Discover curated ${input.niche.toLowerCase()} products for your store.`,
    ctaText:
      toStringValue(copySource.ctaText) ||
      toStringValue((source as Record<string, unknown>).ctaText) ||
      'Shop the Collection',
  };

  const categoriesRaw = Array.isArray(source.categories) ? source.categories : [];
  const categories = categoriesRaw
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (isRecord(item)) {
        return (
          toStringValue(item.name) ||
          toStringValue(item.title) ||
          toStringValue(item.label) ||
          toStringValue(item.category)
        );
      }
      return '';
    })
    .filter((item) => item.length > 0)
    .slice(0, input.categoriesCount);

  const demoProductsRaw = Array.isArray(source.demoProducts) ? source.demoProducts : [];
  const demoProducts = demoProductsRaw
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const numericPrice =
        typeof item.priceKES === 'number'
          ? item.priceKES
          : typeof item.price === 'number'
            ? item.price
            : Number(item.priceKES ?? item.price ?? 1000);
      return {
        name: toStringValue(item.name) || 'Product',
        priceKES: Number.isFinite(numericPrice) && numericPrice > 0 ? numericPrice : 1000,
        description:
          toStringValue(item.description) ||
          `${toStringValue(item.name) || 'Product'} for ${input.niche.toLowerCase()} stores.`,
        imagePrompt: toStringValue(item.imagePrompt) || toStringValue(item.nanoBananaPrompt) || undefined,
        nanoBananaPrompt: toStringValue(item.nanoBananaPrompt) || toStringValue(item.imagePrompt) || undefined,
        imageUrl: toStringValue(item.imageUrl) || undefined,
      };
    })
    .slice(0, input.productsCount);

  const promotionsRaw = Array.isArray(source.salesPromotions)
    ? source.salesPromotions
    : Array.isArray(source.banners)
      ? source.banners
      : [];
  const promotions = promotionsRaw
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item, index) => ({
      title: toStringValue(item.title) || `${input.niche} Offer ${index + 1}`,
      subtitle:
        toStringValue(item.subtitle) ||
        toStringValue(item.description) ||
        `Limited-time ${input.niche.toLowerCase()} offer.`,
      ctaText: toStringValue(item.ctaText) || toStringValue(item.cta_text) || 'Shop Now',
      imagePrompt: toStringValue(item.imagePrompt) || toStringValue(item.nanoBananaPrompt) || undefined,
      nanoBananaPrompt: toStringValue(item.nanoBananaPrompt) || toStringValue(item.imagePrompt) || undefined,
      imageUrl: toStringValue(item.imageUrl) || toStringValue(item.image) || undefined,
    }))
    .slice(0, 2);

  while (promotions.length < 2) {
    const idx = promotions.length + 1;
    promotions.push({
      title: `${input.niche} Offer ${idx}`,
      subtitle: `Limited-time ${input.niche.toLowerCase()} promotion.`,
      ctaText: 'Shop Now',
      imagePrompt: `${input.niche} promotional banner, 4k ecommerce style`,
      nanoBananaPrompt: `${input.niche} promotional banner, 4k ecommerce style`,
      imageUrl: undefined,
    });
  }

  const blogPostsRaw = Array.isArray(source.blogPosts) ? source.blogPosts : [];
  const blogPosts = blogPostsRaw
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item, index) => ({
      title: toStringValue(item.title) || `${input.niche} Insights ${index + 1}`,
      summary:
        toStringValue(item.summary) ||
        toStringValue(item.excerpt) ||
        toStringValue(item.description) ||
        '',
    }))
    .slice(0, input.blogPostsCount);

  const sourceTheme = isRecord(source.theme) ? source.theme : {};
  const sourceThemeConfig = isRecord(sourceTheme.config) ? sourceTheme.config : {};
  const sourceThemeColors = isRecord(sourceTheme.colors) ? sourceTheme.colors : {};
  const sourceThemeConfigColors = isRecord(sourceThemeConfig.colors) ? sourceThemeConfig.colors : {};
  const themeConfigRaw = isRecord(source.themeConfig)
    ? source.themeConfig
    : {
        ...sourceTheme,
        ...sourceThemeConfig,
      };
  const normalizedThemeConfig: Record<string, { hex: string; description: string }> = {};
  const knownThemeKeys = new Set([
    'primary',
    'secondary',
    'accent',
    'background',
    'text',
    'muted',
    'buttonbackground',
    'buttontext',
    'buttonforeground',
    'buttonbg',
  ]);

  for (const [key, value] of Object.entries(themeConfigRaw)) {
    if (isRecord(value) && typeof value.hex === 'string') {
      const normalizedKey = normalizeThemeColorKey(key);
      const normalizedHex = normalizeHexColor(value.hex);
      if (!normalizedHex) continue;
      normalizedThemeConfig[normalizedKey] = {
        hex: normalizedHex,
        description: toStringValue(value.description) || `${normalizedKey} color`,
      };
      continue;
    }

    if (typeof value === 'string') {
      const normalizedKeyCandidate = key.toLowerCase().replace(/[\s_-]/g, '');
      if (!knownThemeKeys.has(normalizedKeyCandidate)) continue;
      const normalizedHex = normalizeHexColor(value);
      if (!normalizedHex) continue;
      const normalizedKey = normalizeThemeColorKey(key);
      normalizedThemeConfig[normalizedKey] = {
        hex: normalizedHex,
        description: `${normalizedKey} color`,
      };
    }
  }

  const themeColorsArray = Array.isArray(themeConfigRaw.colors) ? themeConfigRaw.colors : [];
  for (const item of themeColorsArray) {
    if (!isRecord(item)) continue;
    const key =
      toStringValue(item.key) ||
      toStringValue(item.name) ||
      toStringValue(item.label).toLowerCase().replace(/\s+/g, '');
    const hex = toStringValue(item.hex) || toStringValue(item.value);
    if (!key || !hex) continue;
    const normalizedKey = normalizeThemeColorKey(key);
    const normalizedHex = normalizeHexColor(hex);
    if (!normalizedHex) continue;
    normalizedThemeConfig[normalizedKey] = {
      hex: normalizedHex,
      description: toStringValue(item.description) || `${normalizedKey} color`,
    };
  }

  const flatThemeSources: Array<Record<string, unknown>> = [
    sourceThemeColors,
    sourceThemeConfigColors,
  ];
  for (const themeSource of flatThemeSources) {
    for (const [key, value] of Object.entries(themeSource)) {
      const normalizedKeyCandidate = key.toLowerCase().replace(/[\s_-]/g, '');
      if (!knownThemeKeys.has(normalizedKeyCandidate)) continue;
      const normalizedHex = normalizeHexColor(value);
      if (!normalizedHex) continue;
      const normalizedKey = normalizeThemeColorKey(key);
      if (normalizedThemeConfig[normalizedKey]) continue;
      normalizedThemeConfig[normalizedKey] = {
        hex: normalizedHex,
        description: `${normalizedKey} color`,
      };
    }
  }

  return {
    copy,
    categories,
    demoProducts,
    salesPromotions: promotions,
    blogPosts,
    themeConfig: Object.keys(normalizedThemeConfig).length > 0 ? normalizedThemeConfig : undefined,
  };
}

function buildCategoryFallbacks(niche: string, count: number): string[] {
  const title = niche.trim() || 'Specialty';
  const base = [
    `${title} Bouquets`,
    `${title} Arrangements`,
    `${title} Gift Sets`,
    `${title} Occasion Specials`,
    `${title} Best Sellers`,
    `${title} Seasonal Picks`,
    `${title} Premium Collection`,
    `${title} Everyday Value`,
  ];
  return base.slice(0, Math.max(1, count));
}

function buildProductFallbacks(niche: string, categories: string[], count: number) {
  const title = niche.trim() || 'Specialty';
  const sourceCategories = categories.length > 0 ? categories : buildCategoryFallbacks(title, count);
  const items: Array<{
    name: string;
    priceKES: number;
    description: string;
    imagePrompt: string;
    nanoBananaPrompt: string;
    imageUrl?: string;
  }> = [];

  for (let i = 0; i < Math.max(1, count); i += 1) {
    const categoryName = sourceCategories[i % sourceCategories.length];
    const productName = `${categoryName} ${i + 1}`;
    const price = 1000 + i * 250;
    const prompt = `4k realistic ecommerce product photo of ${productName} for ${title}, studio lighting, clean background, high detail`;
    items.push({
      name: productName,
      priceKES: price,
      description: `A premium ${productName.toLowerCase()} curated for ${title.toLowerCase()} shoppers.`,
      imagePrompt: withImageNegativePrompt(prompt),
      nanoBananaPrompt: withImageNegativePrompt(prompt),
      imageUrl: undefined,
    });
  }

  return items;
}

function ensureStarterPackCompleteness(
  starterPack: z.infer<typeof generatedStarterPackSchema>,
  input: { niche: string; categoriesCount: number; productsCount: number }
): z.infer<typeof generatedStarterPackSchema> {
  const requestedCategoryCount = Math.max(1, input.categoriesCount);
  const requestedProductCount = Math.max(1, input.productsCount);

  const normalizedCategories = starterPack.categories
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, requestedCategoryCount);

  const categoryFallbacks = buildCategoryFallbacks(input.niche, requestedCategoryCount);
  const categories = [...normalizedCategories];
  for (const fallbackCategory of categoryFallbacks) {
    if (categories.length >= requestedCategoryCount) break;
    if (categories.includes(fallbackCategory)) continue;
    categories.push(fallbackCategory);
  }

  const normalizedProducts = starterPack.demoProducts
    .filter((item) => item.name.trim().length > 0)
    .slice(0, requestedProductCount);
  const productFallbacks = buildProductFallbacks(input.niche, categories, requestedProductCount);
  const demoProducts = [...normalizedProducts];
  for (const fallbackProduct of productFallbacks) {
    if (demoProducts.length >= requestedProductCount) break;
    if (demoProducts.some((existing) => existing.name.trim().toLowerCase() === fallbackProduct.name.trim().toLowerCase())) {
      continue;
    }
    demoProducts.push(fallbackProduct);
  }

  return {
    ...starterPack,
    categories,
    demoProducts,
  };
}

async function loadStarterPackFromExistingBusiness(params: {
  sellingInput: string;
  sellingKey: string;
  businessType?: string;
  themeSlug: string;
  locale: string;
  currency: string;
  categoriesCount: number;
  productsCount: number;
  niche: string;
}) {
  const sellingMatchKeys = buildSellingMatchKeys(params.sellingInput);
  const cacheRows = sellingMatchKeys.length > 0
    ? await prisma.$queryRaw<Array<{
        id: string;
        source_tenant_id: string | null;
        starter_pack_data: Prisma.JsonValue | null;
      }>>`
        SELECT
          id,
          source_tenant_id,
          starter_pack_data
        FROM onboarding_starter_packs
        WHERE
          selling_key = ANY(${sellingMatchKeys}::text[])
          AND theme_slug = ${params.themeSlug}
          AND locale = ${params.locale}
          AND currency = ${params.currency}
        ORDER BY updated_at DESC
        LIMIT 1
      `
    : [];

  const cachedPack = cacheRows[0];
  if (cachedPack && isRecord(cachedPack.starter_pack_data)) {
    try {
      const parsedCached = generatedStarterPackSchema.parse(
        normalizeGeneratedStarterPack(cachedPack.starter_pack_data, {
          niche: params.niche,
          categoriesCount: params.categoriesCount,
          productsCount: params.productsCount,
          blogPostsCount: 2,
        })
      );
      return {
        sourceTenantId: cachedPack.source_tenant_id || null,
        sourceKind: 'cache' as const,
        starterPack: stripReusedImageUrls(
          ensureStarterPackCompleteness(parsedCached, {
            niche: params.niche,
            categoriesCount: params.categoriesCount,
            productsCount: params.productsCount,
          })
        ),
      };
    } catch (error) {
      console.warn('[StarterPack][Trace] Cached starter pack parse failed, trying tenant fallback', {
        sellingKey: params.sellingKey,
        themeSlug: params.themeSlug || null,
        error: error instanceof Error ? error.message : 'Unknown cache parse error',
      });
    }
  }

  const businessTypeFilter = params.businessType?.trim()
    ? `%${params.businessType.trim().toLowerCase()}%`
    : null;

  const rows = await prisma.$queryRaw<Array<{
    id: string;
    selling: string;
    onboarding_starter_pack: Prisma.JsonValue | null;
  }>>`
    SELECT
      id,
      COALESCE(data->>'selling', '') AS selling,
      data->'onboarding_starter_pack' AS onboarding_starter_pack
    FROM tenants
    WHERE
      COALESCE((data->>'isDemo')::boolean, false) != true
      AND COALESCE((data->>'is_demo')::boolean, false) != true
      AND LENGTH(TRIM(COALESCE(data->>'selling', ''))) > 0
      AND (
        ${businessTypeFilter}::text IS NULL
        OR LOWER(COALESCE(data->>'business_type', '')) LIKE ${businessTypeFilter}
      )
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 200
  `;

  const source = rows.find((row) => isSellingEquivalent(row.selling, params.sellingInput));
  if (!source?.id) {
    return null;
  }

  const products = await prisma.products.findMany({
    where: {
      tenant_id: source.id,
      status: 'active',
    },
    select: {
      name: true,
      price: true,
      description: true,
      image: true,
      metadata: true,
    },
    take: Math.max(1, params.productsCount),
    orderBy: { created_at: 'desc' },
  });

  const categoriesDb = await prisma.categories.findMany({
    where: {
      tenant_id: source.id,
      status: 'active',
    },
    select: { name: true },
    take: Math.max(1, params.categoriesCount),
    orderBy: { created_at: 'desc' },
  });

  const storedPack = isRecord(source.onboarding_starter_pack) ? source.onboarding_starter_pack : null;
  const storedCopy = storedPack && isRecord(storedPack.copy) ? storedPack.copy : null;
  const storedCategories = storedPack && Array.isArray(storedPack.categories)
    ? storedPack.categories.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  const storedSalesPromotions = storedPack && Array.isArray(storedPack.salesPromotions)
    ? storedPack.salesPromotions
    : [];

  const parsed = generatedStarterPackSchema.parse({
    copy: {
      headline: typeof storedCopy?.headline === 'string' ? storedCopy.headline : `Fresh ${params.niche} for Every Occasion`,
      subheadline:
        typeof storedCopy?.subheadline === 'string'
          ? storedCopy.subheadline
          : `Explore curated ${params.niche.toLowerCase()} collections from stores like yours.`,
      ctaText: typeof storedCopy?.ctaText === 'string' ? storedCopy.ctaText : 'Shop the Collection',
    },
    categories:
      (storedCategories.length > 0 ? storedCategories : categoriesDb.map((item) => item.name))
        .slice(0, params.categoriesCount),
    demoProducts: products.map((product) => {
      const metadata = isRecord(product.metadata) ? product.metadata : {};
      const generatedPrompt =
        typeof metadata.generated_image_prompt === 'string' ? metadata.generated_image_prompt : undefined;
      return {
        name: product.name,
        priceKES: Number(product.price),
        description: product.description || `${product.name} for ${params.niche.toLowerCase()} businesses.`,
        imagePrompt: generatedPrompt,
        nanoBananaPrompt: generatedPrompt,
        imageUrl: product.image || undefined,
      };
    }),
    salesPromotions: [0, 1].map((index) => {
      const currentRaw = storedSalesPromotions[index];
      const current = isRecord(currentRaw) ? currentRaw : {};
      const title = typeof current.title === 'string' ? current.title : `${params.niche} Special Offer ${index + 1}`;
      const subtitle =
        typeof current.subtitle === 'string'
          ? current.subtitle
          : `Limited-time ${params.niche.toLowerCase()} discount for your customers.`;
      const ctaText = typeof current.ctaText === 'string' ? current.ctaText : 'Shop Now';
      const imagePromptRaw =
        typeof current.imagePrompt === 'string' ? current.imagePrompt : `${title} banner for ${params.niche}`;
      const imagePrompt = withImageNegativePrompt(imagePromptRaw);
      const imageUrl = typeof current.imageUrl === 'string' ? current.imageUrl : undefined;
      return {
        title,
        subtitle,
        ctaText,
        imagePrompt,
        nanoBananaPrompt: imagePrompt,
        imageUrl,
      };
    }),
    blogPosts: [],
  });

  return {
    sourceTenantId: source.id,
    sourceKind: 'tenant-match' as const,
    starterPack: stripReusedImageUrls(parsed),
  };
}

/**
 * Remove `imageUrl` from products and promotions that we inherit from another
 * tenant's starter pack, while preserving image prompts. This forces Nano Banana
 * to regenerate fresh imagery per-tenant instead of every new store rendering
 * identical photos from the first tenant in that niche.
 */
function stripReusedImageUrls(
  pack: z.infer<typeof generatedStarterPackSchema>
): z.infer<typeof generatedStarterPackSchema> {
  return {
    ...pack,
    demoProducts: pack.demoProducts.map((product) => ({
      ...product,
      imageUrl: undefined,
    })),
    salesPromotions: pack.salesPromotions.map((promotion) => ({
      ...promotion,
      imageUrl: undefined,
    })) as typeof pack.salesPromotions,
  };
}

async function upsertStarterPackCache(params: {
  sellingInput: string;
  themeSlug: string;
  locale: string;
  currency: string;
  sourceTenantId?: string | null;
  starterPack: z.infer<typeof generatedStarterPackSchema>;
}) {
  const sellingKey = normalizeSellingKey(params.sellingInput);
  if (!sellingKey) return;

  await prisma.$executeRaw`
    INSERT INTO onboarding_starter_packs (
      selling_key,
      selling_raw,
      business_type,
      theme_slug,
      locale,
      currency,
      source_tenant_id,
      starter_pack_data,
      is_complete,
      updated_at
    )
    VALUES (
      ${sellingKey},
      ${params.sellingInput},
      ${null},
      ${params.themeSlug},
      ${params.locale},
      ${params.currency},
      ${params.sourceTenantId || null}::uuid,
      ${params.starterPack as unknown as Prisma.JsonValue}::jsonb,
      ${true},
      NOW()
    )
    ON CONFLICT (selling_key, theme_slug, locale, currency)
    DO UPDATE SET
      selling_raw = EXCLUDED.selling_raw,
      source_tenant_id = EXCLUDED.source_tenant_id,
      starter_pack_data = EXCLUDED.starter_pack_data,
      is_complete = EXCLUDED.is_complete,
      updated_at = NOW()
  `;
}

type ThemeLookup = {
  id: string;
  slug: string;
  title: string;
  colors: Prisma.JsonValue | null;
};

function normalizeThemeColors(value: Prisma.JsonValue | null | undefined): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string') {
      result[key] = item;
    }
  }
  return result;
}

async function resolveTheme(themeId?: string, themeSlug?: string): Promise<ThemeLookup | null> {
  if (themeId) {
    return prisma.themes.findUnique({
      where: { id: themeId },
      select: {
        id: true,
        slug: true,
        title: true,
        colors: true,
      },
    });
  }

  if (themeSlug) {
    return prisma.themes.findFirst({
      where: { slug: { equals: themeSlug, mode: 'insensitive' } },
      select: {
        id: true,
        slug: true,
        title: true,
        colors: true,
      },
    });
  }

  const fallback = await prisma.themes.findFirst({
    where: { status: true },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      colors: true,
    },
  });

  return fallback;
}

function buildGeminiPrompts(input: {
  businessType: string;
  niche: string;
  locale: string;
  currency: string;
  productsCount: number;
  categoriesCount: number;
  blogPostsCount: number;
  storeName?: string;
  themeTitle?: string;
  themeColorSettings: ReturnType<typeof getThemeColorSettingsWithDefaults>;
}) {
  const themeColorInstruction = input.themeColorSettings
    .map((item) => `- ${item.key}: ${item.defaultHex} (${item.description})`)
    .join('\n');

  const systemInstruction = [
    'You are an ecommerce onboarding specialist for DukaNest.',
    'Return ONLY valid JSON with no markdown and no extra prose.',
    'The output must preserve the existing ecommerce information architecture while adapting copy and product data to the target niche.',
    'For themeConfig, include ALL provided color keys and include a description for each key.',
    'For demoProducts, every item must include a highly descriptive Nano Banana image prompt suitable for 4k output.',
    'For salesPromotions, generate exactly 2 promotion banners with strong sales wording and dedicated image prompts.',
    // Niche-first grounding for imagery — requested directly by the user:
    // images must depict what the merchant actually sells (niche), not the
    // broader business-type category. `input.niche` here is already
    // resolved as niche || selling || businessType by the caller (see the
    // `niche` local variable in POST below), so this instruction is safe
    // even when the merchant never gave a niche and it fell back to
    // business type.
    'Every image prompt (demoProducts.imagePrompt and salesPromotions.imagePrompt) must depict the specific niche below, not the broader business type category — e.g. for niche "electric scooters" under business type "Retail", every image prompt must show electric scooters specifically, never generic retail/shop imagery.',
  ].join(' ');

  const userPrompt = [
    // Niche is the primary, authoritative signal for everything generated
    // here (categories, products, image prompts) — business type is only
    // secondary context (e.g. for general tone), never a co-equal subject
    // for image prompts to describe.
    `Generate a Store Starter Pack for a store selling: "${input.niche}" (general business type for context only: "${input.businessType}").`,
    input.storeName ? `Store name: "${input.storeName}".` : 'Store name: not provided.',
    `Locale: ${input.locale}. Currency: ${input.currency}.`,
    `Provide exactly ${input.categoriesCount} categories, ${input.productsCount} demo products, 2 sales promotions, and ${input.blogPostsCount} blog posts — every one of them specific to "${input.niche}".`,
    input.themeTitle ? `Base theme: ${input.themeTitle}.` : 'Base theme: default.',
    'Theme color keys and descriptions to include in themeConfig:',
    themeColorInstruction,
    'Each themeConfig entry must be an object with shape: { "hex": "#RRGGBB", "description": "..." }.',
    'Each demoProducts item must include: name, priceKES, description, imagePrompt.',
    'Each salesPromotions item must include: title, subtitle, ctaText, imagePrompt.',
    'Ensure copy.headline, copy.subheadline, and copy.ctaText are compelling and niche-specific.',
    `Image prompts must depict "${input.niche}" specifically (real products/scenes a customer buying that would recognize) and specify: 4k resolution, studio-quality lighting, realistic ecommerce photography, and a consistent background style.`,
    'Explicitly avoid bananas or banana fruit in any image prompt.',
    'Do not include branded logos, trademarked packaging, or copyrighted characters.',
  ].join('\n');

  return { systemInstruction, userPrompt };
}

async function executeGeminiJson(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userPrompt: string;
}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: params.systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: params.userPrompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('Gemini returned an empty response body');
  }

  // Real token counts for cost tracking (@/lib/ai/gemini-cost.ts) — 0 if
  // the API response didn't include usageMetadata (never invented).
  // thoughtsTokenCount is REAL billed output too — gemini-2.5-flash uses
  // extended thinking by default, and Google bills those tokens at the
  // same output rate as candidatesTokenCount but reports them in a
  // SEPARATE field. Found live-testing a real cost projection (DA.22):
  // a real call showed candidatesTokenCount=2003 but thoughtsTokenCount=
  // 2253 — omitting it would have undercounted real cost by ~2x for any
  // call that used thinking, not a rounding error.
  const usage = {
    promptTokenCount: Number(payload?.usageMetadata?.promptTokenCount) || 0,
    candidatesTokenCount:
      (Number(payload?.usageMetadata?.candidatesTokenCount) || 0) +
      (Number(payload?.usageMetadata?.thoughtsTokenCount) || 0),
  };

  try {
    return { parsed: JSON.parse(text), usage };
  } catch {
    throw new Error('Gemini response is not valid JSON');
  }
}

/**
 * Records one Gemini usage row — best-effort, never throws into the caller.
 * `tenantId` is genuinely nullable here: this route's most common real path
 * (src/app/api/onboarding/starter-pack-jobs/route.ts) runs before a tenant
 * exists yet, and that anonymous/pre-registration usage is real cost worth
 * tracking, not something to silently drop. See migration
 * 20260824180000_ai_usage_log_provider_and_nullable_tenant.sql.
 */
async function recordGeminiTextUsage(params: {
  tenantId: string | null;
  model: string;
  usage: { promptTokenCount: number; candidatesTokenCount: number };
}): Promise<void> {
  try {
    await recordAiUsage({
      tenantId: params.tenantId,
      feature: 'starter_pack_content',
      bucket: 'setup',
      provider: 'gemini',
      usage: { inputTokens: params.usage.promptTokenCount, outputTokens: params.usage.candidatesTokenCount },
      estimatedCost: estimateGeminiTextCostUsd(params.model, params.usage),
      itemCount: 1,
    });
  } catch (error) {
    console.warn('[StarterPack][Trace] Failed to record Gemini text usage (non-fatal)', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function shouldTryNextGeminiModel(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('404') ||
    message.includes('not_found') ||
    message.includes('not found') ||
    message.includes('no longer available') ||
    message.includes('not supported')
  );
}

async function executeGeminiJsonWithFallback(params: {
  apiKey: string;
  preferredModel: string;
  systemInstruction: string;
  userPrompt: string;
}) {
  const attemptedModels: string[] = [];
  const modelsToTry = Array.from(new Set([params.preferredModel, ...GEMINI_FALLBACK_MODELS]));
  let lastError: unknown = null;

  for (const model of modelsToTry) {
    attemptedModels.push(model);
    try {
      const { parsed, usage } = await executeGeminiJson({
        apiKey: params.apiKey,
        model,
        systemInstruction: params.systemInstruction,
        userPrompt: params.userPrompt,
      });
      return {
        raw: parsed,
        usage,
        usedModel: model,
        attemptedModels,
      };
    } catch (error) {
      lastError = error;
      if (!shouldTryNextGeminiModel(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini request failed for all fallback models');
}

/**
 * DA.24: reuse cache for the 5 generic homepage images. Deliberately separate
 * from loadStarterPackFromExistingBusiness()'s cache (which intentionally
 * strips reused image URLs for specific-looking fake product photos, see
 * stripReusedImageUrls) — these 5 images are never product-specific, so
 * reusing the exact same URLs across tenants sharing a style is safe and
 * expected (same reasoning Wix/Squarespace/Shopify's Burst library rely on
 * for shared stock/template imagery). Capped at GENERIC_IMAGE_CACHE_REUSE_CAP
 * reuses per style+theme so a very popular niche doesn't render identically
 * for hundreds of stores forever — count-based rather than time-based, so a
 * rarely-used style never gets force-regenerated just because a calendar
 * window passed, while a genuinely popular one still gets refreshed.
 */
const GENERIC_IMAGE_CACHE_REUSE_CAP = 8;

interface GenericImageCacheHit {
  hero: string;
  banners: string[];
  splitLayout: string | null;
  reuseCount: number;
}

async function loadGenericImageCache(styleKey: string, themeSlug: string): Promise<GenericImageCacheHit | null> {
  if (!styleKey) return null;
  try {
    const row = await prisma.onboarding_generic_image_cache.findUnique({
      where: { style_key_theme_slug: { style_key: styleKey, theme_slug: themeSlug } },
    });
    if (!row || row.reuse_count >= GENERIC_IMAGE_CACHE_REUSE_CAP) return null;
    const banners = Array.isArray(row.banner_urls)
      ? (row.banner_urls as unknown[]).filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
      : [];
    if (!row.hero_url || banners.length === 0) return null;

    await prisma.onboarding_generic_image_cache.update({
      where: { id: row.id },
      data: { reuse_count: { increment: 1 } },
    });

    return {
      hero: row.hero_url,
      banners,
      splitLayout: row.split_url,
      reuseCount: row.reuse_count + 1,
    };
  } catch (error) {
    // Best-effort — a cache read failure should fall through to real
    // generation, never block or error out the whole request.
    console.warn('[StarterPack][Trace] Generic image cache read failed (falling back to generation)', {
      error: error instanceof Error ? error.message : 'Unknown cache read error',
    });
    return null;
  }
}

async function saveGenericImageCache(params: {
  styleKey: string;
  styleRaw: string;
  themeSlug: string;
  hero: string;
  banners: string[];
  splitLayout: string | null;
  sourceTenantId: string | null;
}): Promise<void> {
  if (!params.styleKey || !params.hero || params.banners.length === 0) return;
  try {
    await prisma.onboarding_generic_image_cache.upsert({
      where: { style_key_theme_slug: { style_key: params.styleKey, theme_slug: params.themeSlug } },
      create: {
        style_key: params.styleKey,
        style_raw: params.styleRaw,
        theme_slug: params.themeSlug,
        hero_url: params.hero,
        banner_urls: params.banners,
        split_url: params.splitLayout,
        reuse_count: 0,
        source_tenant_id: params.sourceTenantId,
      },
      update: {
        hero_url: params.hero,
        banner_urls: params.banners,
        split_url: params.splitLayout,
        reuse_count: 0,
        source_tenant_id: params.sourceTenantId,
      },
    });
  } catch (error) {
    // Best-effort — a cache write failure should never break the response
    // that already has real, successfully generated images in hand.
    console.warn('[StarterPack][Trace] Generic image cache write failed (non-fatal)', {
      error: error instanceof Error ? error.message : 'Unknown cache write error',
    });
  }
}

function extractImageUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  if (typeof root.imageUrl === 'string') return root.imageUrl;
  if (typeof root.url === 'string') return root.url;
  if (Array.isArray(root.images) && typeof root.images[0] === 'string') return root.images[0] as string;

  const data = root.data;
  if (data && typeof data === 'object') {
    const nested = data as Record<string, unknown>;
    if (typeof nested.imageUrl === 'string') return nested.imageUrl;
    if (typeof nested.url === 'string') return nested.url;
    if (Array.isArray(nested.images) && typeof nested.images[0] === 'string') return nested.images[0] as string;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const traceId =
    request.headers.get('x-registration-trace-id') ||
    `sp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const requestStartedAt = Date.now();
    const body = await request.json();
    const input = starterPackRequestSchema.parse(body);
    const clientIp = getClientIp(request);

    const ipLimit = await checkRateLimit(`ratelimit:ai:starter-pack:ip:${clientIp}`, 20, 60 * 60);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many starter-pack requests. Please try again later.',
          },
        },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
      );
    }

    const shouldUseExternalAi = input.includeGeminiCall || input.includeNanoBananaCall;
    if (shouldUseExternalAi) {
      const expensiveCallLimit = await checkRateLimit(
        `ratelimit:ai:starter-pack:external:${clientIp}`,
        10,
        60 * 60
      );
      if (!expensiveCallLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AI_USAGE_LIMIT_EXCEEDED',
              message: 'AI generation rate limit reached. Please try again later.',
            },
          },
          { status: 429, headers: { 'Retry-After': String(expensiveCallLimit.retryAfterSeconds) } }
        );
      }
    }

    if (input.tenantId && shouldUseExternalAi) {
      const tenantDailyLimit = Number(process.env.AI_STARTER_PACK_DAILY_LIMIT || '50');
      const tenantLimit = await checkRateLimit(
        `ratelimit:ai:starter-pack:tenant:${input.tenantId}`,
        tenantDailyLimit,
        60 * 60 * 24
      );
      if (!tenantLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'TENANT_AI_QUOTA_EXCEEDED',
              message: 'Tenant AI starter-pack daily quota reached.',
            },
          },
          { status: 429, headers: { 'Retry-After': String(tenantLimit.retryAfterSeconds) } }
        );
      }
    }

    // DA.21 — genericImagesOnly short-circuits everything below: no niche
    // resolution, no selling-exists reuse check, no demoProducts/categories/
    // salesPromotions text generation at all. Just 5 generic images.
    if (input.genericImagesOnly) {
      const nanoBananaApiKey =
        process.env.NANO_BANANA_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
      if (!nanoBananaApiKey) {
        console.warn('[StarterPack][Trace] Missing Gemini API key for genericImagesOnly', { traceId });
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'GEMINI_API_KEY_MISSING',
              message: 'Set GEMINI_API_KEY (or GOOGLE_AI_API_KEY) to enable image generation.',
            },
          },
          { status: 400 }
        );
      }

      // DA.24: reuse cache check — a style (niche, or business type when
      // niche is empty) that's already been generated recently for this
      // theme skips Gemini entirely (real $0 cost, near-instant), up to
      // GENERIC_IMAGE_CACHE_REUSE_CAP reuses. See loadGenericImageCache().
      const styleRaw = (input.niche || input.selling || input.businessType).trim();
      const styleKey = normalizeSellingKey(styleRaw);
      const cacheTheme = await resolveTheme(input.themeId, input.themeSlug);
      const themeSlug = cacheTheme?.slug || 'default';

      const cached = await loadGenericImageCache(styleKey, themeSlug);
      if (cached) {
        console.log('[StarterPack][Trace] genericImagesOnly served from cache', {
          traceId,
          styleKey,
          themeSlug,
          reuseCount: cached.reuseCount,
        });
        return NextResponse.json({
          success: true,
          data: {
            genericImages: {
              hero: cached.hero,
              banners: cached.banners,
              splitLayout: cached.splitLayout,
            },
            nanoBanana: { durationMs: 0, completed: 0, succeeded: 0, failed: 0, results: [] },
            imageSource: 'cache',
            cacheReuseCount: cached.reuseCount,
          },
        });
      }

      const genericJobs = buildGenericHomepageImageJobs(input.businessType, input.niche || input.selling);
      const execution = await executeNanoBananaJobs({
        apiKey: nanoBananaApiKey,
        jobs: genericJobs,
        tenantId: input.tenantId ?? null,
        feature: 'starter_pack_image',
        bucket: 'setup',
      });

      // `success: true` only means Gemini generated an image — it does NOT
      // guarantee the Supabase upload afterward also succeeded (a real gap
      // found live-testing this: one job came back success:true with
      // imageUrl:null, uploaded:false). Require a real non-empty URL, not
      // just the generation flag.
      const urlFor = (label: string) => {
        const url = execution.results.find((r) => r.productName === label)?.imageUrl;
        return typeof url === 'string' && url.trim() ? url : null;
      };

      const genericImages = {
        hero: urlFor('Hero'),
        banners: [urlFor('Banner 1'), urlFor('Banner 2'), urlFor('Banner 3')].filter(
          (url): url is string => url !== null
        ),
        splitLayout: urlFor('Split Layout'),
      };

      console.log('[StarterPack][Trace] genericImagesOnly completed', {
        traceId,
        durationMs: execution.durationMs,
        succeeded: execution.succeeded,
        failed: execution.failed,
        hero: Boolean(genericImages.hero),
        banners: genericImages.banners.length,
        splitLayout: Boolean(genericImages.splitLayout),
      });

      // Cache a genuinely complete set (hero + all 3 banners) for future
      // reuse. A partial set (e.g. an upload failure dropped a banner) is
      // deliberately never cached — caching a hole would just serve the same
      // hole to every future reuse of this style until the cap resets it.
      if (genericImages.hero && genericImages.banners.length === 3) {
        await saveGenericImageCache({
          styleKey,
          styleRaw,
          themeSlug,
          hero: genericImages.hero,
          banners: genericImages.banners,
          splitLayout: genericImages.splitLayout,
          sourceTenantId: input.tenantId ?? null,
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          genericImages,
          nanoBanana: execution,
          imageSource: 'generated',
          cacheReuseCount: 0,
        },
      });
    }

    const niche = (input.niche || input.selling || input.businessType).trim();
    const sellingPrecheck = input.checkSellingExists
      ? await checkSellingExists({
          selling: niche,
          businessType: input.businessType,
        })
      : null;
    const shouldCallExternalApis = input.forceExternalGeneration || !(sellingPrecheck?.exists);
    let shouldCallExternalApisEffective = shouldCallExternalApis;
    console.log('[StarterPack][Trace] Request parsed', {
      traceId,
      businessType: input.businessType,
      niche,
      includeGeminiCall: input.includeGeminiCall,
      includeNanoBananaCall: input.includeNanoBananaCall,
      checkSellingExists: input.checkSellingExists,
      forceExternalGeneration: input.forceExternalGeneration,
      shouldCallExternalApis,
      sellingExists: sellingPrecheck?.exists ?? null,
      sellingMatchCount: sellingPrecheck?.exactMatchCount ?? 0,
    });

    const theme = await resolveTheme(input.themeId, input.themeSlug);
    const fallbackThemeDefaults = getThemeDefaults(theme?.slug ?? 'default');
    const baseThemeColors = {
      ...(fallbackThemeDefaults?.colors ?? {}),
      ...normalizeThemeColors(theme?.colors),
    };
    const themeColorSettings = getThemeColorSettingsWithDefaults(baseThemeColors);
    const { systemInstruction, userPrompt } = buildGeminiPrompts({
      businessType: input.businessType,
      niche,
      locale: input.locale,
      currency: input.currency,
      productsCount: input.productsCount,
      categoriesCount: input.categoriesCount,
      blogPostsCount: input.blogPostsCount,
      storeName: input.storeName,
      themeTitle: theme?.title,
      themeColorSettings,
    });

    let parsedStarterPack: z.infer<typeof generatedStarterPackSchema> | null = null;
    let geminiRaw: unknown = null;
    let geminiDurationMs: number | null = null;
    let geminiUsedModel = input.geminiModel;
    let geminiAttemptedModels: string[] = [input.geminiModel];
    let reusedExistingBusiness = false;
    let reuseSourceTenantId: string | null = null;
    let starterPackSource:
      | 'cache'
      | 'tenant-match'
      | 'generated'
      | 'provided-result'
      | 'none' = 'none';

    if (input.includeGeminiCall && !input.forceExternalGeneration) {
      const reused = await loadStarterPackFromExistingBusiness({
        sellingInput: niche,
        sellingKey: normalizeSellingKey(niche),
        businessType: input.businessType,
        themeSlug: theme?.slug || 'default',
        locale: input.locale,
        currency: input.currency,
        categoriesCount: input.categoriesCount,
        productsCount: input.productsCount,
        niche,
      });

      if (reused) {
        parsedStarterPack = reused.starterPack;
        reusedExistingBusiness = true;
        reuseSourceTenantId = reused.sourceTenantId;
        starterPackSource = reused.sourceKind;
        shouldCallExternalApisEffective = false;
        geminiRaw = {
          source: 'existing_business_match',
          sourceTenantId: reused.sourceTenantId,
        };
        console.log('[StarterPack][Trace] Reused existing business starter pack, Gemini skipped', {
          traceId,
          sourceTenantId: reused.sourceTenantId,
          categories: parsedStarterPack.categories.length,
          products: parsedStarterPack.demoProducts.length,
        });

        // Image URLs are intentionally stripped by `stripReusedImageUrls` so
        // that Nano Banana regenerates fresh, per-tenant imagery rather than
        // every store in this niche sharing the same photos. We therefore gate
        // "reuse completeness" on text content (theme + prompts), not on
        // whether the source tenant had images.
        const hasThemeConfig = Boolean(
          parsedStarterPack.themeConfig && Object.keys(parsedStarterPack.themeConfig).length > 0
        );
        const productsWithPrompt = parsedStarterPack.demoProducts.filter((item) => {
          const prompt = item.imagePrompt || item.nanoBananaPrompt;
          return typeof prompt === 'string' && prompt.trim().length > 0;
        }).length;
        const promotionsWithPrompt = parsedStarterPack.salesPromotions.filter((item) => {
          const prompt = item.imagePrompt || item.nanoBananaPrompt;
          return typeof prompt === 'string' && prompt.trim().length > 0;
        }).length;

        const reuseIsCompleteEnough =
          hasThemeConfig &&
          productsWithPrompt >= Math.max(1, Math.floor(Math.min(input.productsCount, 8) * 0.5)) &&
          promotionsWithPrompt >= 1;

        if (!reuseIsCompleteEnough) {
          console.log('[StarterPack][Trace] Existing business content incomplete, switching to external generation', {
            traceId,
            sourceTenantId: reused.sourceTenantId,
            hasThemeConfig,
            productsWithPrompt,
            promotionsWithPrompt,
          });
          parsedStarterPack = null;
          reusedExistingBusiness = false;
          reuseSourceTenantId = null;
          shouldCallExternalApisEffective = true;
        }
      }
    }

    if (input.includeGeminiCall && shouldCallExternalApisEffective) {
      const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
      if (!geminiApiKey) {
        console.warn('[StarterPack][Trace] Missing Gemini API key', { traceId });
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'GEMINI_API_KEY_MISSING',
              message: 'Set GEMINI_API_KEY (or GOOGLE_AI_API_KEY) to enable Gemini execution.',
            },
          },
          { status: 400 }
        );
      }

      const geminiStartedAt = Date.now();
      try {
        const geminiResult = await executeGeminiJsonWithFallback({
          apiKey: geminiApiKey,
          preferredModel: input.geminiModel,
          systemInstruction,
          userPrompt,
        });
        geminiRaw = geminiResult.raw;
        geminiUsedModel = geminiResult.usedModel;
        geminiAttemptedModels = geminiResult.attemptedModels;
        await recordGeminiTextUsage({
          tenantId: input.tenantId ?? null,
          model: geminiResult.usedModel,
          usage: geminiResult.usage,
        });
        parsedStarterPack = generatedStarterPackSchema.parse(
          normalizeGeneratedStarterPack(geminiRaw, {
            niche,
            categoriesCount: input.categoriesCount,
            productsCount: input.productsCount,
            blogPostsCount: input.blogPostsCount,
          })
        );
        parsedStarterPack = ensureStarterPackCompleteness(parsedStarterPack, {
          niche,
          categoriesCount: input.categoriesCount,
          productsCount: input.productsCount,
        });
      } catch (geminiError) {
        console.warn('[StarterPack][Trace] Gemini generation failed; using deterministic fallback starter pack', {
          traceId,
          error: geminiError instanceof Error ? geminiError.message : 'Unknown Gemini error',
        });
        geminiRaw = {
          error: geminiError instanceof Error ? geminiError.message : 'Unknown Gemini error',
          source: 'deterministic_fallback',
        };
        parsedStarterPack = generatedStarterPackSchema.parse(
          normalizeGeneratedStarterPack({}, {
            niche,
            categoriesCount: input.categoriesCount,
            productsCount: input.productsCount,
            blogPostsCount: input.blogPostsCount,
          })
        );
        parsedStarterPack = ensureStarterPackCompleteness(parsedStarterPack, {
          niche,
          categoriesCount: input.categoriesCount,
          productsCount: input.productsCount,
        });
        starterPackSource = 'generated';
      }

      if (!hasThemeVariationFromDefaults(parsedStarterPack.themeConfig, themeColorSettings)) {
        console.warn('[StarterPack][Trace] Gemini returned default-like theme colors; attempting theme-only retry', {
          traceId,
          model: geminiUsedModel,
        });
        try {
          const retryPrompt = buildThemeOnlyPrompt({
            businessType: input.businessType,
            niche,
            themeColorSettings,
          });
          const themeRetry = await executeGeminiJsonWithFallback({
            apiKey: geminiApiKey,
            preferredModel: geminiUsedModel,
            systemInstruction:
              'You are a UI theming assistant. Return ONLY valid JSON with no markdown and no extra prose.',
            userPrompt: retryPrompt,
          });
          await recordGeminiTextUsage({
            tenantId: input.tenantId ?? null,
            model: themeRetry.usedModel,
            usage: themeRetry.usage,
          });

          const normalizedThemeRetry = normalizeGeneratedStarterPack(themeRetry.raw, {
            niche,
            categoriesCount: input.categoriesCount,
            productsCount: input.productsCount,
            blogPostsCount: input.blogPostsCount,
          });

          if (
            normalizedThemeRetry.themeConfig &&
            hasThemeVariationFromDefaults(normalizedThemeRetry.themeConfig, themeColorSettings)
          ) {
            parsedStarterPack = {
              ...parsedStarterPack,
              themeConfig: normalizedThemeRetry.themeConfig,
            };
            geminiUsedModel = themeRetry.usedModel;
            geminiAttemptedModels = Array.from(
              new Set([...geminiAttemptedModels, ...themeRetry.attemptedModels]),
            );
            console.log('[StarterPack][Trace] Theme-only retry produced niche-specific colors', {
              traceId,
              model: themeRetry.usedModel,
              keys: Object.keys(normalizedThemeRetry.themeConfig),
            });
          } else {
            console.warn('[StarterPack][Trace] Theme-only retry still matched defaults; keeping original themeConfig', {
              traceId,
            });
          }
        } catch (themeRetryError) {
          console.warn('[StarterPack][Trace] Theme-only retry failed; keeping original themeConfig', {
            traceId,
            error: themeRetryError instanceof Error ? themeRetryError.message : 'Unknown error',
          });
        }
      }

      starterPackSource = 'generated';
      geminiDurationMs = Date.now() - geminiStartedAt;
      console.log('[StarterPack][Trace] Gemini generation completed', {
        traceId,
        durationMs: geminiDurationMs,
        model: geminiUsedModel,
        attemptedModels: geminiAttemptedModels,
        themeConfigKeys: Object.keys(parsedStarterPack.themeConfig ?? {}),
        themeConfigCount: Object.keys(parsedStarterPack.themeConfig ?? {}).length,
        themeConfigVariesFromDefaults: hasThemeVariationFromDefaults(
          parsedStarterPack.themeConfig,
          themeColorSettings
        ),
        categories: parsedStarterPack.categories.length,
        products: parsedStarterPack.demoProducts.length,
        salesPromotions: parsedStarterPack.salesPromotions.length,
        blogPosts: parsedStarterPack.blogPosts.length,
      });
    } else if (input.geminiResult) {
      geminiRaw = input.geminiResult;
      parsedStarterPack = generatedStarterPackSchema.parse(
        normalizeGeneratedStarterPack(input.geminiResult, {
          niche,
          categoriesCount: input.categoriesCount,
          productsCount: input.productsCount,
          blogPostsCount: input.blogPostsCount,
        })
      );
      parsedStarterPack = ensureStarterPackCompleteness(parsedStarterPack, {
        niche,
        categoriesCount: input.categoriesCount,
        productsCount: input.productsCount,
      });
      starterPackSource = 'provided-result';
      console.log('[StarterPack][Trace] Used provided geminiResult payload', { traceId });
    } else {
      console.log('[StarterPack][Trace] Gemini generation skipped', {
        traceId,
        reason: input.includeGeminiCall
          ? 'selling precheck requested skip'
          : 'includeGeminiCall is false',
      });
    }

    const nanoBananaSalt =
      (input.variationSeed && input.variationSeed.trim()) ||
      (input.tenantId && input.tenantId.trim()) ||
      (input.storeName && input.storeName.trim()) ||
      traceId;
    const nanoBananaJobs = parsedStarterPack
      ? buildNanoBananaJobs(parsedStarterPack, { salt: nanoBananaSalt })
      : [];
    let nanoBananaExecution: Awaited<ReturnType<typeof executeNanoBananaJobs>> | null = null;
    let nanoBananaSkippedReason: string | null = null;

    // NOTE: We used to skip Nano Banana entirely when `reusedExistingBusiness`
    // was true. That caused every tenant in the same niche to share identical
    // images. We now always regenerate images (with a tenant-specific salt) so
    // reused text content does not imply reused photos.
    if (input.includeNanoBananaCall && parsedStarterPack && nanoBananaJobs.length > 0) {
      const nanoBananaApiKey =
        process.env.NANO_BANANA_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_AI_API_KEY;

      if (nanoBananaApiKey) {
        console.log('[StarterPack][Trace] Image generation provider: gemini-sdk', {
          traceId,
          imageModelPrimary: DEFAULT_GEMINI_IMAGE_MODEL,
          imageModelFallbacks: GEMINI_IMAGE_FALLBACK_MODELS,
        });
        console.log('[StarterPack][Trace] Nano Banana execution started', {
          traceId,
          jobs: nanoBananaJobs.length,
        });
        nanoBananaExecution = await executeNanoBananaJobs({
          apiKey: nanoBananaApiKey,
          jobs: nanoBananaJobs,
          tenantId: input.tenantId ?? null,
          feature: 'starter_pack_image',
          bucket: 'setup',
        });
        console.log('[StarterPack][Trace] Nano Banana execution completed', {
          traceId,
          durationMs: nanoBananaExecution.durationMs,
          succeeded: nanoBananaExecution.succeeded,
          failed: nanoBananaExecution.failed,
        });
      } else {
        nanoBananaSkippedReason = 'Missing API key for image generation';
        console.warn('[StarterPack][Trace] Nano Banana execution skipped - missing config', {
          traceId,
          hasApiKey: Boolean(nanoBananaApiKey),
          usesGeminiSdk: true,
        });
      }
    } else if (input.includeNanoBananaCall && (!parsedStarterPack || nanoBananaJobs.length === 0)) {
      nanoBananaSkippedReason = parsedStarterPack
        ? 'No Nano Banana prompts available'
        : 'Gemini starter pack not available';
    } else if (!input.includeNanoBananaCall) {
      nanoBananaSkippedReason = 'includeNanoBananaCall is false';
    }

    if (parsedStarterPack && nanoBananaExecution) {
      const productImageMap = new Map<string, string>();
      const promoImageMap = new Map<string, string>();

      for (const item of nanoBananaExecution.results) {
        if (!item.success || !item.imageUrl) continue;
        if (item.kind === 'product') {
          productImageMap.set(item.productName.toLowerCase(), item.imageUrl);
        } else if (item.kind === 'sales_promotion') {
          promoImageMap.set(item.productName.toLowerCase(), item.imageUrl);
        }
      }

      parsedStarterPack = {
        ...parsedStarterPack,
        demoProducts: parsedStarterPack.demoProducts.map((product) => ({
          ...product,
          imageUrl: productImageMap.get(product.name.toLowerCase()) || product.imageUrl,
        })),
        salesPromotions: parsedStarterPack.salesPromotions.map((promotion) => ({
          ...promotion,
          imageUrl: promoImageMap.get(promotion.title.toLowerCase()) || promotion.imageUrl,
        })),
      };
    }

    if (parsedStarterPack && shouldCallExternalApisEffective) {
      await upsertStarterPackCache({
        sellingInput: niche,
        themeSlug: theme?.slug || 'default',
        locale: input.locale,
        currency: input.currency,
        sourceTenantId: null,
        starterPack: parsedStarterPack,
      });
      console.log('[StarterPack][Trace] Starter-pack cache upserted', {
        traceId,
        sellingKey: normalizeSellingKey(niche),
        themeSlug: theme?.slug || 'default',
        locale: input.locale,
        currency: input.currency,
      });
    }

    const totalDurationMs = Date.now() - requestStartedAt;

    return NextResponse.json({
      success: true,
      data: {
        traceId,
        reuseSourceTenantId,
        timings: {
          totalMs: totalDurationMs,
          geminiMs: geminiDurationMs,
          nanoBananaMs: nanoBananaExecution?.durationMs ?? null,
        },
        niche,
        starterPackSource,
        sellingPrecheck: {
          enabled: input.checkSellingExists,
          ...(sellingPrecheck ?? {
            exists: false,
            exactMatchCount: 0,
            matches: [],
          }),
          shouldCallExternalApis: shouldCallExternalApisEffective,
          reason: shouldCallExternalApisEffective
            ? 'No matching selling found, proceed with Gemini/Nano Banana'
            : 'Matching selling exists, external generation skipped unless forced',
        },
        theme: theme
          ? {
              id: theme.id,
              slug: theme.slug,
              title: theme.title,
            }
          : null,
        themeConfig: {
          requiredColorSettings: themeColorSettings,
        },
        gemini: {
          model: geminiUsedModel,
          attemptedModels: geminiAttemptedModels,
          responseMimeType: 'application/json',
          systemInstruction,
          userPrompt,
          outputContract: {
            themeConfig: {
              '<colorKey>': {
                hex: '#RRGGBB',
                description: 'How this color should be used in the theme',
              },
            },
            copy: {
              headline: 'string',
              subheadline: 'string',
              ctaText: 'string',
            },
            categories: ['string'],
            demoProducts: [
              {
                name: 'string',
                priceKES: 1200,
                description: 'string',
                imagePrompt: 'string',
                imageUrl: 'https://...',
              },
            ],
            salesPromotions: [
              {
                title: 'string',
                subtitle: 'string',
                ctaText: 'string',
                imagePrompt: 'string',
                imageUrl: 'https://...',
              },
            ],
            blogPosts: [
              {
                title: 'string',
                summary: 'string',
              },
            ],
          },
          generatedStarterPack: parsedStarterPack,
          rawResponse: geminiRaw,
          skippedBySellingCheck: input.includeGeminiCall && !shouldCallExternalApisEffective,
          reusedExistingBusiness,
          source: starterPackSource,
        },
        nanoBanana: {
          endpointContract: {
            promptField: 'prompt',
            recommendedResolution: '4k',
            recommendedFormat: 'png',
          },
          includeNanoBananaCall: input.includeNanoBananaCall,
          jobs: nanoBananaJobs,
          executed: nanoBananaExecution,
          skippedReason: nanoBananaSkippedReason,
        },
      },
    });
  } catch (error) {
    console.error('[StarterPack][Trace] Route error', {
      traceId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid starter pack request payload',
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
          message: error instanceof Error ? error.message : 'Failed to prepare starter pack prompts',
        },
      },
      { status: 500 }
    );
  }
}
