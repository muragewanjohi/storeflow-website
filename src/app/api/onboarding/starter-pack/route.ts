import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getThemeDefaults } from '@/lib/themes/theme-defaults';
import { getThemeColorSettingsWithDefaults } from '@/lib/themes/color-settings';
import { buildSellingMatchKeys, checkSellingExists, isSellingEquivalent, normalizeSellingKey } from '@/lib/onboarding/selling-check';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODELS = ['gemini-1.5-flash'];
const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
const GEMINI_IMAGE_FALLBACK_MODELS = ['gemini-2.5-flash-image'];
const IMAGE_NEGATIVE_PROMPT =
  'Do NOT include bananas, banana fruit, banana peels, or any banana-shaped props. Keep the scene strictly relevant to the target product.';

const starterPackRequestSchema = z.object({
  businessType: z.string().min(1, 'businessType is required'),
  selling: z.string().optional(),
  niche: z.string().optional(),
  storeName: z.string().optional(),
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

function withImageNegativePrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return IMAGE_NEGATIVE_PROMPT;
  const lower = trimmed.toLowerCase();
  if (lower.includes('do not include bananas') || lower.includes('banana fruit')) {
    return trimmed;
  }
  return `${trimmed}. ${IMAGE_NEGATIVE_PROMPT}`;
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
  const categories =
    starterPack.categories.length > 0
      ? starterPack.categories.slice(0, input.categoriesCount)
      : buildCategoryFallbacks(input.niche, input.categoriesCount);

  const demoProducts =
    starterPack.demoProducts.length > 0
      ? starterPack.demoProducts.slice(0, input.productsCount)
      : buildProductFallbacks(input.niche, categories, input.productsCount);

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
        starterPack: ensureStarterPackCompleteness(parsedCached, {
          niche: params.niche,
          categoriesCount: params.categoriesCount,
          productsCount: params.productsCount,
        }),
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
    starterPack: parsed,
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
  ].join(' ');

  const userPrompt = [
    `Generate a Store Starter Pack for business type "${input.businessType}" and niche "${input.niche}".`,
    input.storeName ? `Store name: "${input.storeName}".` : 'Store name: not provided.',
    `Locale: ${input.locale}. Currency: ${input.currency}.`,
    `Provide exactly ${input.categoriesCount} categories, ${input.productsCount} demo products, 2 sales promotions, and ${input.blogPostsCount} blog posts.`,
    input.themeTitle ? `Base theme: ${input.themeTitle}.` : 'Base theme: default.',
    'Theme color keys and descriptions to include in themeConfig:',
    themeColorInstruction,
    'Each themeConfig entry must be an object with shape: { "hex": "#RRGGBB", "description": "..." }.',
    'Each demoProducts item must include: name, priceKES, description, imagePrompt.',
    'Each salesPromotions item must include: title, subtitle, ctaText, imagePrompt.',
    'Ensure copy.headline, copy.subheadline, and copy.ctaText are compelling and niche-specific.',
    'Image prompts must specify: 4k resolution, studio-quality lighting, realistic ecommerce photography, and a consistent background style.',
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

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Gemini response is not valid JSON');
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
      const raw = await executeGeminiJson({
        apiKey: params.apiKey,
        model,
        systemInstruction: params.systemInstruction,
        userPrompt: params.userPrompt,
      });
      return {
        raw,
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

function buildNanoBananaJobs(starterPack: z.infer<typeof generatedStarterPackSchema>) {
  const productJobs = starterPack.demoProducts
    .map((product, index) => {
      const promptRaw = product.imagePrompt || product.nanoBananaPrompt;
      const prompt = promptRaw ? withImageNegativePrompt(promptRaw) : '';
      if (!prompt) {
        return null;
      }

      return {
        index: index + 1,
        kind: 'product' as const,
        productName: product.name,
        prompt,
        output: {
          resolution: '4k',
          format: 'png',
          style: 'realistic-product-photography',
        },
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const promoJobs = starterPack.salesPromotions
    .map((promotion, index) => {
      const promptRaw = promotion.imagePrompt || promotion.nanoBananaPrompt;
      const prompt = promptRaw ? withImageNegativePrompt(promptRaw) : '';
      if (!prompt) {
        return null;
      }

      return {
        index: productJobs.length + index + 1,
        kind: 'sales_promotion' as const,
        productName: promotion.title,
        prompt,
        output: {
          resolution: '4k',
          format: 'png',
          style: 'realistic-promotional-banner',
        },
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return [...productJobs, ...promoJobs];
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

async function executeNanoBananaJobs(params: {
  apiKey: string;
  jobs: ReturnType<typeof buildNanoBananaJobs>;
}) {
  const genAI = new GoogleGenerativeAI(params.apiKey);
  const startedAt = Date.now();
  const results = await Promise.all(
    params.jobs.map(async (job) => {
      const itemStartedAt = Date.now();
      try {
        let inlineImage: { mimeType: string; data: string } | null = null;
        let usedModel = DEFAULT_GEMINI_IMAGE_MODEL;
        let lastError: unknown = null;
        const modelsToTry = [DEFAULT_GEMINI_IMAGE_MODEL, ...GEMINI_IMAGE_FALLBACK_MODELS];

        for (const modelName of modelsToTry) {
          try {
            const imageModel = genAI.getGenerativeModel({
              model: modelName,
            });
            const imageResponse = await imageModel.generateContent(job.prompt);
            const parts = imageResponse.response?.candidates?.[0]?.content?.parts ?? [];
            const inlinePart = parts.find(
              (part: any) => part?.inlineData?.data && part?.inlineData?.mimeType
            );
            if (inlinePart?.inlineData?.data && inlinePart?.inlineData?.mimeType) {
              inlineImage = {
                mimeType: inlinePart.inlineData.mimeType,
                data: inlinePart.inlineData.data,
              };
              usedModel = modelName;
              break;
            }
          } catch (error) {
            lastError = error;
          }
        }

        if (!inlineImage) {
          throw (
            lastError instanceof Error
              ? lastError
              : new Error('Gemini image model returned no inline image data')
          );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'product-images';
        let publicUrl: string | null = null;
        let storagePath: string | null = null;

        if (supabaseUrl && supabaseServiceRole) {
          const supabase = createClient(supabaseUrl, supabaseServiceRole);
          const extension = inlineImage.mimeType.includes('png')
            ? 'png'
            : inlineImage.mimeType.includes('webp')
              ? 'webp'
              : 'jpg';
          storagePath = `onboarding/starter-pack/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
          const imageBuffer = Buffer.from(inlineImage.data, 'base64');
          const uploadResult = await supabase.storage
            .from(bucketName)
            .upload(storagePath, imageBuffer, {
              contentType: inlineImage.mimeType,
              upsert: false,
            });
          if (!uploadResult.error) {
            const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
            publicUrl = urlData.publicUrl;
          }
        }

        return {
          ...job,
          success: true,
          durationMs: Date.now() - itemStartedAt,
          imageUrl: publicUrl,
          storagePath,
          rawResponse: {
            provider: 'gemini-image-sdk',
            model: usedModel,
            mimeType: inlineImage.mimeType,
            uploaded: Boolean(publicUrl),
          },
        };
      } catch (error) {
        return {
          ...job,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown Gemini image generation error',
          durationMs: Date.now() - itemStartedAt,
          rawResponse: null,
          imageUrl: null,
        };
      }
    })
  );

  return {
    durationMs: Date.now() - startedAt,
    completed: results.length,
    succeeded: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    results,
  };
}

export async function POST(request: NextRequest) {
  const traceId =
    request.headers.get('x-registration-trace-id') ||
    `sp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const requestStartedAt = Date.now();
    const body = await request.json();
    const input = starterPackRequestSchema.parse(body);

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

    if (input.includeGeminiCall && !shouldCallExternalApis) {
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

        const hasThemeConfig = Boolean(
          parsedStarterPack.themeConfig && Object.keys(parsedStarterPack.themeConfig).length > 0
        );
        const productsWithImageUrl = parsedStarterPack.demoProducts.filter(
          (item) => typeof item.imageUrl === 'string' && item.imageUrl.length > 0
        ).length;
        const promotionsWithImageUrl = parsedStarterPack.salesPromotions.filter(
          (item) => typeof item.imageUrl === 'string' && item.imageUrl.length > 0
        ).length;

        const reuseIsCompleteEnough =
          hasThemeConfig &&
          productsWithImageUrl >= Math.max(1, Math.floor(Math.min(input.productsCount, 8) * 0.5)) &&
          promotionsWithImageUrl >= 1;

        if (!reuseIsCompleteEnough) {
          console.log('[StarterPack][Trace] Existing business content incomplete, switching to external generation', {
            traceId,
            sourceTenantId: reused.sourceTenantId,
            hasThemeConfig,
            productsWithImageUrl,
            promotionsWithImageUrl,
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
      const geminiResult = await executeGeminiJsonWithFallback({
        apiKey: geminiApiKey,
        preferredModel: input.geminiModel,
        systemInstruction,
        userPrompt,
      });
      geminiRaw = geminiResult.raw;
      geminiUsedModel = geminiResult.usedModel;
      geminiAttemptedModels = geminiResult.attemptedModels;
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
      geminiDurationMs = Date.now() - geminiStartedAt;
      console.log('[StarterPack][Trace] Gemini generation completed', {
        traceId,
        durationMs: geminiDurationMs,
        model: geminiUsedModel,
        attemptedModels: geminiAttemptedModels,
        themeConfigKeys: Object.keys(parsedStarterPack.themeConfig ?? {}),
        themeConfigCount: Object.keys(parsedStarterPack.themeConfig ?? {}).length,
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
      console.log('[StarterPack][Trace] Used provided geminiResult payload', { traceId });
    } else {
      console.log('[StarterPack][Trace] Gemini generation skipped', {
        traceId,
        reason: input.includeGeminiCall
          ? 'selling precheck requested skip'
          : 'includeGeminiCall is false',
      });
    }

    const nanoBananaJobs = parsedStarterPack ? buildNanoBananaJobs(parsedStarterPack) : [];
    let nanoBananaExecution: Awaited<ReturnType<typeof executeNanoBananaJobs>> | null = null;
    let nanoBananaSkippedReason: string | null = null;

    if (reusedExistingBusiness) {
      nanoBananaSkippedReason = 'Reused existing business content';
    } else if (input.includeNanoBananaCall && parsedStarterPack && nanoBananaJobs.length > 0) {
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
