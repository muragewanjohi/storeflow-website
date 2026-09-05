/**
 * AI Phase 10 — Customer Outreach Content (docs/IMPLEMENTATION_TRACKER.md).
 *
 * "Distinct from AI Phase 6 (Marketing Image Generation) — Phase 6 is
 * store-facing (banners/hero images for the storefront itself); this is
 * customer-outreach content the merchant sends OUT to reach buyers."
 *
 * Phase A (text): one Claude call producing a social caption + hashtags, a
 * WhatsApp broadcast/status message, and a short SMS blurb — all grounded
 * in the tenant's REAL current sales/products, same real-context-or-decline
 * discipline as @/lib/marketing-images/marketing-image-shared.ts's
 * writeMarketingImageBatch() (this module deliberately mirrors that one's
 * grounding shape rather than reinventing it, since DA.28 already proved it
 * live: "deliberately referencing 'my flash sale' ... generated ... no
 * fabricated sale name/discount").
 *
 * Phase B (shareable image): reuses writeMarketingImageBatch() +
 * renderAndSaveMarketingImages() directly, NOT a parallel image pipeline —
 * a targeted, single-image request description built from the same
 * resolved real context, styled as a promotional graphic with the real
 * product name/price rendered as TEXT on the image (never a photorealistic
 * claim to BE the real product). Billed under the same 'marketing_image_prompt'
 * AiFeature every other merchant-triggered image generation already uses
 * (homepage regenerate, free-form marketing images) — NOT a new
 * 'social_content_image' feature as this phase's original scoping note
 * speculated, since that note was written before this session's DA.28/DA.32
 * work established the real precedent: a chat-assistant intent's own text
 * cost rides the shared 'assistant_query' bucket (DA.0's decision, every
 * other intent already does this), while any REAL image generation it
 * triggers gets its own nested 'marketing_image_prompt' check/record, same
 * as handleHomepageImageConfigTarget/handleMarketingImagesConfigTarget
 * already do. Reusing the existing bucket is more consistent with what's
 * actually shipped than inventing a fourth one.
 */

import { prisma } from '@/lib/prisma/client';
import { generateJson, type AiUsage } from '@/lib/ai/claude-client';
import { writeMarketingImageBatch, renderAndSaveMarketingImages } from '@/lib/marketing-images/marketing-image-shared';

export interface SocialContentContext {
  activeSales: Array<{ name: string; description: string | null; badge_text: string | null }>;
  products: Array<{ name: string; price: number | null }>;
}

/**
 * Real, current context to ground content in — never invent a sale,
 * discount, product, or price. Same shape/discipline as
 * marketing-image-shared.ts's getMarketingImageContext(), plus real price
 * (Phase A's spec explicitly wants "REAL product name/price/description").
 */
export async function getSocialContentContext(tenantId: string): Promise<SocialContentContext> {
  const [activeSales, sampleProducts] = await Promise.all([
    prisma.sales.findMany({
      where: { tenant_id: tenantId, status: 'active' },
      select: { name: true, description: true, badge_text: true },
      take: 5,
      orderBy: { created_at: 'desc' },
    }),
    prisma.products.findMany({
      where: { tenant_id: tenantId, status: 'active' },
      select: { name: true, price: true },
      take: 15,
      orderBy: { created_at: 'desc' },
    }),
  ]);
  return {
    activeSales,
    products: sampleProducts.map((p) => ({ name: p.name, price: p.price != null ? Number(p.price) : null })),
  };
}

function formatContextForPrompt(businessType: string | null, niche: string | null, context: SocialContentContext): string {
  const businessContext = businessType
    ? `The store's recorded business type is "${businessType}"${niche ? ` and its niche is "${niche}"` : ''}.`
    : 'No specific business type is recorded for this store — keep it generic retail.';
  const salesContext =
    context.activeSales.length > 0
      ? `Their REAL currently active sales/promotions: ${context.activeSales
          .map((s) => `"${s.name}"${s.badge_text ? ` (badge: ${s.badge_text})` : ''}${s.description ? ` — ${s.description}` : ''}`)
          .join('; ')}. If the request refers to a current sale/promotion, ground it in ONE of these REAL ones by name — never invent a sale name, discount percentage, or dates that aren't in this real list.`
      : 'This store has no currently active sales/promotions — never invent one.';
  const productContext =
    context.products.length > 0
      ? `A sample of their REAL current products (name — price in KES, "?" if no price recorded): ${context.products
          .map((p) => `"${p.name}" — ${p.price != null ? `KES ${p.price.toLocaleString('en-KE', { maximumFractionDigits: 0 })}` : '?'}`)
          .join('; ')}. If the request names or clearly implies one of these, reference it by its REAL name and, if you use a price, use its REAL recorded price — never invent either.`
      : 'This store has no products listed yet — never invent a specific product name or price.';
  return [businessContext, salesContext, productContext].join(' ');
}

const socialContentTextSchema = {
  type: 'object',
  properties: {
    // A short (<=10 words), honest paraphrase of what this content is
    // actually about, using only real names from the context — e.g. "your
    // Leather Wallet" or "your Flash Sale" or "new arrivals in general" if
    // nothing specific matched. Reused as the subject line if the merchant
    // later confirms they also want a shareable image.
    groundedSubject: { type: 'string' },
    socialCaption: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
    whatsappMessage: { type: 'string' },
    smsMessage: { type: 'string' },
  },
  required: ['groundedSubject', 'socialCaption', 'hashtags', 'whatsappMessage', 'smsMessage'],
  additionalProperties: false,
} as const;

export interface SocialContentTextResult {
  groundedSubject: string;
  socialCaption: string;
  hashtags: string[];
  whatsappMessage: string;
  smsMessage: string;
}

/**
 * Phase A — one Claude call producing all three pieces of outreach content,
 * grounded ONLY in the tenant's real, current sales/products (never an
 * invented product, sale, discount, or price).
 */
export async function generateSocialContentText(params: {
  businessType: string | null;
  niche: string | null;
  context: SocialContentContext;
  requestDescription: string;
}): Promise<{ data: SocialContentTextResult; usage: AiUsage }> {
  const contextText = formatContextForPrompt(params.businessType, params.niche, params.context);

  const system = [
    'You write customer-outreach marketing content for a DukaNest merchant — content THEY send/post to reach their own customers (not content about DukaNest itself).',
    contextText,
    'Write three real, ready-to-send pieces of content for the merchant\'s request below, all grounded in the SAME real subject (a specific product, a specific sale, or general "new arrivals"/"shop with us" wording if nothing specific matches):',
    'socialCaption: an engaging social media caption (Instagram/Facebook style), natural tone matching the business, under 280 characters, no hashtags inside it (hashtags go in their own field).',
    'hashtags: 3-6 relevant hashtags as plain words (no "#" symbol needed), mixing broad retail ones with niche-specific ones.',
    'whatsappMessage: a slightly longer, warmer message suitable for a WhatsApp broadcast or status update to customers.',
    'smsMessage: a short (under 160 characters), direct, action-oriented SMS blurb.',
    'groundedSubject: a short (<=10 words) honest paraphrase of what this is actually about, e.g. "your Leather Wallet" or "your Flash Sale" or "new arrivals in general" — used later if the merchant asks for a matching shareable image.',
    'Never invent a product, sale name, discount percentage, or price that isn\'t in the real context above. If nothing specific matches the request, write general, honest promotional content instead (e.g. a "shop with us" or generic new-arrivals theme) rather than fabricating a specific.',
    'Return ONLY valid JSON with no markdown and no extra prose.',
  ].join(' ');

  return generateJson<SocialContentTextResult>({
    system,
    userContent: `The merchant's request: "${params.requestDescription}"`,
    schema: socialContentTextSchema,
    maxTokens: 700,
  });
}

export interface SocialContentImageResult {
  success: true;
  imageUrl: string;
  mediaId: string | null;
  costUsd: number;
  usage: AiUsage;
}
export interface SocialContentImageFailure {
  success: false;
  error: string;
  usage: AiUsage;
}

/**
 * Phase B — reuses the exact same Claude-writes-prompt -> Gemini-renders
 * pipeline as free-form marketing images (@/lib/marketing-images/marketing-image-shared),
 * targeted at ONE promotional/shareable graphic for the given real subject.
 * Styled as a marketing banner/flyer with the real name/price as TEXT
 * elements on the image, never a photorealistic depiction claiming to BE
 * the real product (same reasoning AI_FEATURES_PLAN.md already applies to
 * starter-pack sales-promotion banners).
 */
export async function generateSocialContentImage(params: {
  tenantId: string;
  apiKey: string;
  businessType: string | null;
  niche: string | null;
  groundedSubject: string;
}): Promise<SocialContentImageResult | SocialContentImageFailure> {
  const requestDescription = `A shareable promotional social-media/WhatsApp graphic for "${params.groundedSubject}" — a clean, eye-catching banner-style image with the subject's real name and price (if applicable) rendered as readable text elements on the graphic, suitable for a customer to receive directly, not a photorealistic product photo.`;

  const { data: batch, usage: writeUsage } = await writeMarketingImageBatch({
    tenantId: params.tenantId,
    businessType: params.businessType,
    niche: params.niche,
    requestDescription,
    requestedCount: 1,
  });

  if (batch.prompts.length === 0) {
    return { success: false, error: "I couldn't work out a good graphic for that.", usage: writeUsage };
  }

  const { images } = await renderAndSaveMarketingImages({
    tenantId: params.tenantId,
    apiKey: params.apiKey,
    prompts: batch.prompts,
    bucket: 'monthly',
  });

  if (images.length === 0) {
    return { success: false, error: 'Generating the actual image failed — please try again in a moment.', usage: writeUsage };
  }

  return {
    success: true,
    imageUrl: images[0].imageUrl,
    mediaId: images[0].mediaId,
    costUsd: images[0].costUsd,
    usage: writeUsage,
  };
}
