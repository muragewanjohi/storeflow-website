/**
 * Shared Gemini "Nano Banana" image-generation job building + execution.
 *
 * Extracted from src/app/api/onboarding/starter-pack/route.ts (where this
 * logic originated, DA.16/DA.17/DA.21) so it can be reused by a second real
 * caller — the post-registration single-image regenerate feature (DA.25,
 * src/lib/homepage-images/regenerate-shared.ts) — without forking it. The
 * starter-pack route still owns the specific-product/promo job builder
 * (buildNanoBananaJobs, uses real generated product data) and the generic
 * 5-image builder (buildGenericHomepageImageJobs); both, plus the new
 * single-slot builder below, share this one execution implementation.
 *
 * feature/bucket are caller-supplied (not hardcoded to 'starter_pack_image'/
 * 'setup' as they used to be) so usage gets recorded under whichever real
 * AiFeature the caller actually is — the starter pack's automatic 5 images
 * at registration vs. a merchant's later on-demand single-image regenerate
 * are genuinely different features with different quotas, and must not be
 * misattributed to the same usage bucket.
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { recordAiUsage } from '@/lib/ai/usage';
import { estimateGeminiImageCostUsd } from '@/lib/ai/gemini-cost';
import type { AiFeature, AiUsageBucket } from '@/lib/ai/types';

export const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
export const GEMINI_IMAGE_FALLBACK_MODELS = ['gemini-2.5-flash-image'];

const IMAGE_NEGATIVE_PROMPT =
  'Do NOT include bananas, banana fruit, banana peels, or any banana-shaped props. Keep the scene strictly relevant to the target product.';

export function withImageNegativePrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return IMAGE_NEGATIVE_PROMPT;
  const lower = trimmed.toLowerCase();
  if (lower.includes('do not include bananas') || lower.includes('banana fruit')) {
    return trimmed;
  }
  return `${trimmed}. ${IMAGE_NEGATIVE_PROMPT}`;
}

/**
 * Append a tenant/store specific "variation seed" to each Nano Banana prompt so
 * that two stores with identical prompts (e.g. same niche, same product names)
 * get visually distinct images instead of near-duplicates. The seed is opaque to
 * the model; it simply forces a different random walk through the latent space.
 */
export function withVariationSeed(prompt: string, salt: string, jobKey: string): string {
  const trimmedSalt = (salt || '').trim();
  const trimmedKey = (jobKey || '').trim();
  if (!trimmedSalt && !trimmedKey) return prompt;
  const composite = [trimmedSalt, trimmedKey].filter(Boolean).join(':');
  return `${prompt}\n\nUnique composition seed (do not render as text, just use it to vary framing, angle, lighting, props, and color accents so this image is visually distinct from other stores): ${composite}`;
}

/**
 * Shared shape for every Gemini image-generation job — real per-product/
 * per-promotion jobs, the generic 5-image jobs (registration), and a single
 * on-demand regenerate job (post-registration) all produce this same shape,
 * so executeNanoBananaJobs() (the actual Gemini call + upload + cost-
 * tracking logic) is written once and never forked.
 */
export interface NanoBananaJob {
  index: number;
  kind: 'product' | 'sales_promotion' | 'hero' | 'banner' | 'split_layout';
  /** A human label — the real product/promo name for real jobs, a fixed slot label ('Hero', 'Banner 1', ...) for generic/regenerate jobs. */
  productName: string;
  prompt: string;
  output: { resolution: string; format: string; style: string };
}

export function buildNanoBananaJobs(
  starterPack: {
    demoProducts: Array<{ name: string; imagePrompt?: string; nanoBananaPrompt?: string }>;
    salesPromotions: Array<{ title: string; imagePrompt?: string; nanoBananaPrompt?: string }>;
  },
  options?: { salt?: string }
): NanoBananaJob[] {
  const salt = options?.salt?.trim() || '';
  const productJobs = starterPack.demoProducts
    .map((product, index) => {
      const promptRaw = product.imagePrompt || product.nanoBananaPrompt;
      const basePrompt = promptRaw ? withImageNegativePrompt(promptRaw) : '';
      if (!basePrompt) {
        return null;
      }
      const jobKey = `product-${index + 1}-${product.name}`;
      const prompt = salt ? withVariationSeed(basePrompt, salt, jobKey) : basePrompt;

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
      const basePrompt = promptRaw ? withImageNegativePrompt(promptRaw) : '';
      if (!basePrompt) {
        return null;
      }
      const jobKey = `promotion-${index + 1}-${promotion.title}`;
      const prompt = salt ? withVariationSeed(basePrompt, salt, jobKey) : basePrompt;

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

interface GenericImageSlotDef {
  productName: string;
  kind: NanoBananaJob['kind'];
  style: string;
  promptSuffix: string;
}

/**
 * Shared style base + the 5 fixed slot definitions — used both to build all
 * 5 at once (registration) and to build just one of them (post-registration
 * regenerate). Never claims to depict a specific named product, since no
 * real inventory is guaranteed to exist yet when these run.
 */
function buildGenericImageStyleBase(businessType: string, niche?: string): string {
  const style = niche?.trim() || businessType.trim() || 'general retail';
  return (
    `Professional, appealing ecommerce imagery evocative of a store selling "${style}", ` +
    'without depicting any single specific named product — a general mood/lifestyle or category shot, ' +
    'studio-quality or natural lighting, clean modern composition, realistic photography (not illustration).'
  );
}

const GENERIC_IMAGE_SLOT_DEFS: Record<string, GenericImageSlotDef> = {
  hero: {
    productName: 'Hero',
    kind: 'hero',
    style: 'realistic-hero-photography',
    promptSuffix: 'Wide hero-banner composition suitable for the top of a homepage, with open negative space on one side for overlaid text.',
  },
  banner1: {
    productName: 'Banner 1',
    kind: 'banner',
    style: 'realistic-promotional-banner',
    promptSuffix: 'Banner composition themed around "New Arrivals" for this kind of store.',
  },
  banner2: {
    productName: 'Banner 2',
    kind: 'banner',
    style: 'realistic-promotional-banner',
    promptSuffix: 'Banner composition themed around "Best Sellers" for this kind of store.',
  },
  banner3: {
    productName: 'Banner 3',
    kind: 'banner',
    style: 'realistic-promotional-banner',
    promptSuffix: 'Banner composition themed around "Special Offers" for this kind of store.',
  },
  split_layout: {
    productName: 'Split Layout',
    kind: 'split_layout',
    style: 'realistic-product-photography',
    promptSuffix: 'Tall, square-friendly composition suitable for the left half of a split homepage section.',
  },
};

/** The 5 fixed slots, in their canonical order — used by both registration (all 5) and regenerate (pick one). */
export const GENERIC_IMAGE_SLOTS = ['hero', 'banner1', 'banner2', 'banner3', 'split_layout'] as const;
export type GenericImageSlot = (typeof GENERIC_IMAGE_SLOTS)[number];

export function isGenericImageSlot(value: string): value is GenericImageSlot {
  return (GENERIC_IMAGE_SLOTS as readonly string[]).includes(value);
}

/**
 * Exactly 5 generic images (never product-specific — no fake demo products
 * are ever invented) for EVERY new registration (DA.21/DA.23): 1 hero
 * foreground image, 3 banners, 1 split-layout left-side image. Grounded on
 * niche when given (more relevant mood/category imagery — e.g. "evocative
 * of a store selling electric scooters" instead of just "Retail"), business
 * type otherwise — same niche-first-then-business-type discipline as
 * buildGeminiPrompts()'s fix in starter-pack/route.ts.
 */
export function buildGenericHomepageImageJobs(businessType: string, niche?: string): NanoBananaJob[] {
  const baseStyle = buildGenericImageStyleBase(businessType, niche);
  return GENERIC_IMAGE_SLOTS.map((slot, index) => {
    const def = GENERIC_IMAGE_SLOT_DEFS[slot];
    return {
      index: index + 1,
      kind: def.kind,
      productName: def.productName,
      prompt: withImageNegativePrompt(`${baseStyle} ${def.promptSuffix}`),
      output: { resolution: '4k', format: 'png', style: def.style },
    };
  });
}

/**
 * DA.25: build exactly ONE of the 5 generic homepage image jobs, for the
 * post-registration "regenerate just my hero/banner N/split-layout image"
 * feature — same prompt templates as buildGenericHomepageImageJobs() (one
 * shared source for what each slot's prompt actually says), just a single
 * job instead of all 5.
 */
export function buildSingleHomepageImageJob(
  slot: GenericImageSlot,
  businessType: string,
  niche?: string
): NanoBananaJob {
  const baseStyle = buildGenericImageStyleBase(businessType, niche);
  const def = GENERIC_IMAGE_SLOT_DEFS[slot];
  return {
    index: 1,
    kind: def.kind,
    productName: def.productName,
    prompt: withImageNegativePrompt(`${baseStyle} ${def.promptSuffix}`),
    output: { resolution: '4k', format: 'png', style: def.style },
  };
}

export interface NanoBananaJobResult extends NanoBananaJob {
  success: boolean;
  error?: string;
  durationMs: number;
  imageUrl: string | null;
  storagePath?: string | null;
  imageCostUsd: number;
  rawResponse: { provider: string; model: string; mimeType: string; uploaded: boolean } | null;
}

export interface NanoBananaExecution {
  durationMs: number;
  completed: number;
  succeeded: number;
  failed: number;
  results: NanoBananaJobResult[];
}

export async function executeNanoBananaJobs(params: {
  apiKey: string;
  jobs: NanoBananaJob[];
  tenantId: string | null;
  /** Which AiFeature this batch's real Gemini spend should be recorded under — see module docblock. */
  feature: AiFeature;
  bucket: AiUsageBucket;
}): Promise<NanoBananaExecution> {
  const genAI = new GoogleGenerativeAI(params.apiKey);
  const startedAt = Date.now();
  const results: NanoBananaJobResult[] = await Promise.all(
    params.jobs.map(async (job): Promise<NanoBananaJobResult> => {
      const itemStartedAt = Date.now();
      try {
        let inlineImage: { mimeType: string; data: string } | null = null;
        let usedModel = DEFAULT_GEMINI_IMAGE_MODEL;
        let lastError: unknown = null;
        // Real returned usage, not the requested resolution — DA.17 found
        // live that a "4k resolution" prompt instruction does not make the
        // model actually deliver 4K pixels (a real test returned 1408x768
        // from the primary model); billing off the real image-token count
        // is the only way to get an accurate number. Best-effort, 0 if the
        // SDK response didn't expose usageMetadata.
        let promptTokenCount = 0;
        let imageTokenCount = 0;
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
              const usageMetadata = (imageResponse.response as any)?.usageMetadata;
              promptTokenCount = Number(usageMetadata?.promptTokenCount) || 0;
              const imageDetail = Array.isArray(usageMetadata?.candidatesTokensDetails)
                ? usageMetadata.candidatesTokensDetails.find((d: any) => d?.modality === 'IMAGE')
                : null;
              // Falls back to the overall candidatesTokenCount for an
              // image-only call (no text output to conflate it with) if
              // the per-modality breakdown isn't present.
              imageTokenCount = Number(imageDetail?.tokenCount ?? usageMetadata?.candidatesTokenCount) || 0;
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
        let uploadError: string | null = null;

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
          } else {
            uploadError = uploadResult.error.message;
          }
        } else {
          uploadError = 'Supabase storage is not configured (missing URL or service role key)';
        }

        const imageCostUsd = estimateGeminiImageCostUsd({
          model: usedModel,
          imageTokenCount,
          promptTokenCount,
        });

        // A job with no real, fetchable URL isn't useful to any caller
        // regardless of whether Gemini itself generated the image — a real
        // gap found live-testing DA.21: this used to return success:true
        // with imageUrl:null on an upload failure, silently dropping the
        // image with no visible error anywhere. Cost is still billed
        // (generation genuinely happened), but the job itself is now
        // correctly marked failed.
        if (!publicUrl) {
          console.warn('[NanoBanana][Trace] Upload failed', {
            job: job.productName,
            model: usedModel,
            error: uploadError,
          });
          return {
            ...job,
            success: false,
            error: uploadError ?? 'Image upload failed',
            durationMs: Date.now() - itemStartedAt,
            imageCostUsd,
            rawResponse: null,
            imageUrl: null,
          };
        }

        return {
          ...job,
          success: true,
          durationMs: Date.now() - itemStartedAt,
          imageUrl: publicUrl,
          storagePath,
          imageCostUsd,
          rawResponse: {
            provider: 'gemini-image-sdk',
            model: usedModel,
            mimeType: inlineImage.mimeType,
            uploaded: true,
          },
        };
      } catch (error) {
        return {
          ...job,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown Gemini image generation error',
          durationMs: Date.now() - itemStartedAt,
          imageCostUsd: 0,
          rawResponse: null,
          imageUrl: null,
        };
      }
    })
  );

  // One usage record for the whole batch. Cost is summed from EVERY job
  // that incurred real Gemini generation cost (imageCostUsd > 0), even ones
  // that then failed to upload — Google already billed for the generation
  // itself regardless of what happened afterward (see the upload-failure
  // handling above, DA.21). itemCount stays success-based (real, usable
  // images actually delivered) since that's the more meaningful "how many
  // photos did we get" number for the AI Usage page. Best-effort: never let
  // usage recording fail the actual response.
  const succeededResults = results.filter((item) => item.success);
  const totalCost = results.reduce((sum, item) => sum + (item.imageCostUsd ?? 0), 0);
  if (totalCost > 0) {
    try {
      await recordAiUsage({
        tenantId: params.tenantId,
        feature: params.feature,
        bucket: params.bucket,
        provider: 'gemini',
        usage: { inputTokens: 0, outputTokens: 0 },
        estimatedCost: totalCost,
        itemCount: succeededResults.length,
      });
    } catch (error) {
      console.warn('[NanoBanana][Trace] Failed to record Gemini image usage (non-fatal)', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    durationMs: Date.now() - startedAt,
    completed: results.length,
    succeeded: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    results,
  };
}
