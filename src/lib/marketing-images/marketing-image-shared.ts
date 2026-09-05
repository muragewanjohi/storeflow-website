/**
 * Free-form marketing image generation — shared core (AI Phase 6.1,
 * docs/AI_FEATURES_PLAN.md), used by BOTH the web route
 * (src/app/api/marketing-images/generate/route.ts) and the mobile route
 * (src/app/api/v1/mobile/marketing-images/generate/route.ts).
 *
 * "Claude writes the image prompt (text), the existing Gemini image
 * pipeline renders it — same architecture as the starter-pack's
 * imagePrompt/Nano Banana flow, just invoked outside the one-time
 * onboarding job too." (AI_FEATURES_PLAN.md Phase 6). Reuses
 * @/lib/onboarding/nano-banana-jobs (DA.25's extraction) for the actual
 * Claude-prompt -> Gemini-render -> upload pipeline; this module only adds
 * the batched Claude prompt-writing step and the Media Library save step.
 *
 * Distinct from DA.25's homepage-image regenerate (5 FIXED slots patched
 * directly into the live homepage) and DA.21's registration-time 5 generic
 * images — this is an arbitrary number (1-7) of merchant-directed images
 * for a free-text request (e.g. "a banner for my flash sale", "3 images
 * for my Instagram promoting new arrivals"), with no fixed destination —
 * they land in the tenant's real Media Library (media_uploads,
 * @/app/api/media/route.ts) for the merchant to use anywhere (page
 * builder, a sales promotion's banner_image, product images, etc.), same
 * precision discipline as every other AI feature in this app.
 */

import { prisma } from '@/lib/prisma/client';
import { generateJson, type AiUsage } from '@/lib/ai/claude-client';
import {
  executeNanoBananaJobs,
  withImageNegativePrompt,
  type NanoBananaJob,
  type NanoBananaExecution,
} from '@/lib/onboarding/nano-banana-jobs';
import type { AiUsageBucket } from '@/lib/ai/types';

export const MAX_MARKETING_IMAGES_PER_BATCH = 7;

const marketingImageBatchSchema = {
  type: 'object',
  properties: {
    // A short (<=10 words), honest paraphrase of what was understood —
    // shown back to the merchant for confirmation before anything is
    // generated. Never invent a detail (a sale name, a discount %, a
    // product) that isn't in the real context given below.
    summary: { type: 'string' },
    prompts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          // Short human label, e.g. "Flash Sale Banner 1" — shown in the
          // Media Library and in the confirmation message.
          label: { type: 'string' },
          // The actual detailed Nano Banana image-generation prompt.
          prompt: { type: 'string' },
        },
        required: ['label', 'prompt'],
        additionalProperties: false,
      },
    },
  },
  required: ['summary', 'prompts'],
  additionalProperties: false,
} as const;

interface MarketingImageBatchResult {
  summary: string;
  prompts: Array<{ label: string; prompt: string }>;
}

/**
 * Real, current context to ground the batch in — never let Claude invent a
 * sale name, discount, or product that doesn't actually exist. Deliberately
 * small samples (not the full catalog) — this is style/subject grounding,
 * not a data dump.
 */
async function getMarketingImageContext(tenantId: string) {
  const [activeSales, sampleProducts] = await Promise.all([
    prisma.sales.findMany({
      where: { tenant_id: tenantId, status: 'active' },
      select: { name: true, description: true, badge_text: true },
      take: 5,
      orderBy: { created_at: 'desc' },
    }),
    prisma.products.findMany({
      where: { tenant_id: tenantId, status: 'active' },
      select: { name: true },
      take: 15,
      orderBy: { created_at: 'desc' },
    }),
  ]);
  return { activeSales, productNames: sampleProducts.map((p) => p.name) };
}

function buildMarketingImageBatchSystemPrompt(params: {
  businessType: string | null;
  niche: string | null;
  requestedCount: number;
  activeSales: Array<{ name: string; description: string | null; badge_text: string | null }>;
  productNames: string[];
}): string {
  const businessContext = params.businessType
    ? `The store's recorded business type is "${params.businessType}"${params.niche ? ` and its niche is "${params.niche}"` : ''}.`
    : 'No specific business type is recorded for this store — keep imagery generic retail.';
  const salesContext =
    params.activeSales.length > 0
      ? `Their REAL currently active sales/promotions are: ${params.activeSales
          .map((s) => `"${s.name}"${s.badge_text ? ` (badge: ${s.badge_text})` : ''}${s.description ? ` — ${s.description}` : ''}`)
          .join('; ')}. If the merchant's request refers to a current sale/promotion (e.g. "my flash sale", "the discount I'm running"), ground the imagery/text in ONE of these REAL ones by name — never invent a sale name, discount percentage, or dates that aren't in this real list.`
      : `This store has no currently active sales/promotions. If the merchant's request implies referencing a specific sale, do not invent one — use generic promotional imagery/wording instead (e.g. a plain "Shop Now" or "New Arrivals" theme) and say so plainly in the summary.`;
  const productContext =
    params.productNames.length > 0
      ? `A sample of their REAL current products: ${params.productNames.join(', ')}. If the request names a real product, you may reference it by its real name. Never invent a product name that isn't in this list.`
      : 'This store has no products listed yet — never invent a specific product name.';

  return [
    'You are a marketing-image prompt writer for DukaNest, a Kenyan multi-tenant ecommerce platform. You write detailed image-generation prompts for an AI image model (Gemini/Nano Banana) — you never generate the image yourself, only the text prompt describing it.',
    businessContext,
    salesContext,
    productContext,
    `Generate exactly ${params.requestedCount} distinct image prompt(s) fulfilling the merchant's request below. Each should be visually distinct (different composition, framing, or theme) even if they share a subject — never near-duplicate prompts.`,
    'Each prompt must describe a professional, appealing promotional/marketing photograph or graphic — studio-quality or natural lighting, clean composition suitable for a banner, social post, or ad. Text elements (like a real sale name or "Shop Now") may be described as rendered IN the image where relevant, using only real facts from above.',
    'Never depict a specific real person, brand logo other than the merchant\'s own described business, or copyrighted character.',
    'summary: a short (under 15 words), honest, plain-English description of what you are about to generate — shown to the merchant for confirmation. Do not oversell it.',
    'Return ONLY valid JSON with no markdown and no extra prose.',
  ].join(' ');
}

/**
 * Writes N (1-7) distinct, real-context-grounded image prompts from the
 * merchant's free-text request. Does NOT generate any image itself — pure
 * text generation, cheap, meant to run at proposal time before the
 * merchant confirms (see the assistant's 'marketing_images' target,
 * @/lib/assistant/shared) so a request that gets abandoned never triggers
 * real Gemini spend.
 */
export async function writeMarketingImageBatch(params: {
  tenantId: string;
  businessType: string | null;
  niche: string | null;
  requestDescription: string;
  requestedCount: number;
}): Promise<{ data: MarketingImageBatchResult; usage: AiUsage }> {
  const count = Math.min(Math.max(1, params.requestedCount), MAX_MARKETING_IMAGES_PER_BATCH);
  const { activeSales, productNames } = await getMarketingImageContext(params.tenantId);

  return generateJson<MarketingImageBatchResult>({
    system: buildMarketingImageBatchSystemPrompt({
      businessType: params.businessType,
      niche: params.niche,
      requestedCount: count,
      activeSales,
      productNames,
    }),
    userContent: `The merchant's request: "${params.requestDescription}"`,
    schema: marketingImageBatchSchema,
    maxTokens: 1500,
  });
}

export interface MarketingImageGenerated {
  label: string;
  imageUrl: string;
  mediaId: string | null;
  costUsd: number;
}

export interface MarketingImageBatchExecutionResult {
  images: MarketingImageGenerated[];
  failed: number;
  execution: NanoBananaExecution;
}

/**
 * Renders the already-written prompts via the shared Nano Banana pipeline
 * and saves each successful image into the tenant's real Media Library
 * (media_uploads) — under media/{tenantId}/..., the same storage
 * convention POST /api/media/upload already uses, so these show up
 * alongside manually-uploaded files with zero special-casing anywhere else
 * in the app.
 */
export async function renderAndSaveMarketingImages(params: {
  tenantId: string;
  apiKey: string;
  prompts: Array<{ label: string; prompt: string }>;
  bucket: AiUsageBucket;
}): Promise<MarketingImageBatchExecutionResult> {
  const jobs: NanoBananaJob[] = params.prompts.map((p, index) => ({
    index: index + 1,
    kind: 'marketing',
    productName: p.label,
    prompt: withImageNegativePrompt(p.prompt),
    output: { resolution: '4k', format: 'png', style: 'realistic-promotional-banner' },
  }));

  const execution = await executeNanoBananaJobs({
    apiKey: params.apiKey,
    jobs,
    tenantId: params.tenantId,
    feature: 'marketing_image_prompt',
    bucket: params.bucket,
    storagePathPrefix: `media/${params.tenantId}`,
  });

  const images: MarketingImageGenerated[] = [];
  for (const result of execution.results) {
    if (!result.success || !result.imageUrl) continue;
    let mediaId: string | null = null;
    try {
      const record = await prisma.media_uploads.create({
        data: {
          tenant_id: params.tenantId,
          title: result.productName,
          path: result.storagePath ?? null,
          alt_text: result.productName,
          file_type: 'image/png',
          is_synced: true,
        },
      });
      mediaId = record.id;
    } catch (error) {
      // Best-effort — the image is real and already uploaded/usable via its
      // public URL even if the Media Library row fails to save; never let
      // this hide a real successful generation from the caller.
      console.warn('[MarketingImages][Trace] Generated image but failed to save it to the Media Library', {
        tenantId: params.tenantId,
        label: result.productName,
        error: error instanceof Error ? error.message : 'Unknown media_uploads error',
      });
    }
    images.push({
      label: result.productName,
      imageUrl: result.imageUrl,
      mediaId,
      costUsd: result.imageCostUsd,
    });
  }

  return {
    images,
    failed: execution.results.length - images.length,
    execution,
  };
}
