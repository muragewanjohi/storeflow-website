/**
 * Product Photo QA (AI Phase 5, docs/AI_FEATURES_PLAN.md) — shared core,
 * used by both the web route (src/app/api/products/photo-qa/route.ts) and
 * the mobile route (src/app/api/v1/mobile/products/photo-qa/route.ts), same
 * "one tested implementation, not two copies" pattern as
 * @/lib/products/ai-intake-shared.ts.
 *
 * Vision analysis of the REAL merchant-uploaded photo — quality feedback,
 * suggested alt text, a suggested SEO description, and reshoot tips if it
 * needs one. Never generates or edits the image itself (no image-generation
 * capability is invoked here at all — see generateJsonFromImage()'s own
 * docblock in claude-client.ts). Purely advisory: the caller decides
 * whether to show/apply any of these suggestions; nothing here writes to
 * the product record directly.
 */

import { generateJsonFromImage, type AiUsage } from '@/lib/ai/claude-client';

export const PHOTO_QA_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export type PhotoQaMediaType = (typeof PHOTO_QA_MEDIA_TYPES)[number];

export function isPhotoQaMediaType(value: string): value is PhotoQaMediaType {
  return (PHOTO_QA_MEDIA_TYPES as readonly string[]).includes(value);
}

export const photoQaSchema = {
  type: 'object',
  properties: {
    qualityScore: { type: 'string' },
    // Concrete, specific problems actually visible in THIS photo — empty if none. Never a generic/invented issue.
    issues: { type: 'array', items: { type: 'string' } },
    // Only populated when qualityScore isn't "good" — empty array otherwise.
    reshootSuggestions: { type: 'array', items: { type: 'string' } },
    suggestedAltText: { type: 'string' },
    suggestedSeoDescription: { type: 'string' },
  },
  required: ['qualityScore', 'issues', 'reshootSuggestions', 'suggestedAltText', 'suggestedSeoDescription'],
  additionalProperties: false,
} as const;

export const PHOTO_QA_QUALITY_SCORES = ['good', 'needs_improvement', 'poor'] as const;
export type PhotoQaQualityScore = (typeof PHOTO_QA_QUALITY_SCORES)[number];

export interface PhotoQaRawResult {
  qualityScore: string;
  issues: string[];
  reshootSuggestions: string[];
  suggestedAltText: string;
  suggestedSeoDescription: string;
}

export interface PhotoQaResult {
  qualityScore: PhotoQaQualityScore;
  issues: string[];
  reshootSuggestions: string[];
  suggestedAltText: string;
  suggestedSeoDescription: string;
}

/** Resolves Claude's raw qualityScore string against the real allow-list — never trust it verbatim. Defaults to the safest (most cautious) value if it returns something unexpected. */
function resolveQualityScore(raw: string): PhotoQaQualityScore {
  return (PHOTO_QA_QUALITY_SCORES as readonly string[]).includes(raw) ? (raw as PhotoQaQualityScore) : 'needs_improvement';
}

export function buildPhotoQaSystemPrompt(productName?: string): string {
  return [
    'You are a product-photography quality reviewer for DukaNest, a Kenyan multi-tenant ecommerce platform. You are reviewing a REAL photo the merchant already took and uploaded — you never generate or edit images.',
    productName
      ? `The product this photo is for is called "${productName}" — use this exact name in the alt text and SEO description; do not invent a different name.`
      : 'No product name has been given yet — describe generically what the photo actually shows, do not invent a product name.',
    '"qualityScore": "good" if the photo is clear, reasonably well-lit, in focus, with a clean background suitable for an ecommerce listing. "needs_improvement" for fixable issues (a bit dark, slightly soft focus, busy/distracting background, awkward crop) that do not ruin the photo. "poor" only for photos too unclear or unusable to publish as-is (very blurry, unrecognizable subject, wrong/irrelevant image).',
    '"issues": list only concrete, specific problems you actually see in THIS photo — an empty array if there are none. Never list a generic issue that does not apply to this specific image.',
    '"reshootSuggestions": concrete, actionable tips for a better retake — only when qualityScore is "needs_improvement" or "poor". Leave as an empty array when qualityScore is "good".',
    '"suggestedAltText": short (under 125 characters), accessible, descriptive alt text for exactly what is visible in this image — ALWAYS provide real text describing the actual scene, even when qualityScore is "poor" or the subject is wrong/unclear (e.g. "Blurry photo of a store interior, product not visible" is a valid and correct alt text for a bad photo). Never return an empty string.',
    '"suggestedSeoDescription": 1-2 sentences of product-marketing copy grounded ONLY in what the photo actually shows — never invent materials, features, or specifications you cannot see in the image itself. If qualityScore is "poor" and the actual product is not identifiable in the photo, say so plainly (e.g. "This photo does not clearly show the product — please upload a real product photo.") rather than returning an empty string or inventing marketing copy for something you cannot see.',
    'Return ONLY valid JSON with no markdown and no extra prose.',
  ]
    .filter(Boolean)
    .join(' ');
}

// Matches the 5MB cap already enforced at upload time
// (src/app/api/products/upload/route.ts) — a QA request should never need
// to process anything larger than what upload itself would have accepted.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export class PhotoFetchError extends Error {}

/**
 * Fetches a real, already-uploaded image (from Supabase Storage — the same
 * URL POST /api/products/upload just returned) and converts it to the
 * base64 shape generateJsonFromImage() needs. Shared by both routes so
 * neither reimplements content-type sniffing/size limits independently.
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mediaType: PhotoQaMediaType }> {
  let response: Response;
  try {
    response = await fetch(imageUrl);
  } catch {
    throw new PhotoFetchError('Could not reach the image URL.');
  }
  if (!response.ok) {
    throw new PhotoFetchError(`Image URL returned ${response.status}.`);
  }

  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
  if (!isPhotoQaMediaType(contentType)) {
    throw new PhotoFetchError(`Unsupported image type: ${contentType || 'unknown'}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
    throw new PhotoFetchError('Image exceeds the 5MB size limit.');
  }

  return { base64: Buffer.from(arrayBuffer).toString('base64'), mediaType: contentType };
}

/** Runs one photo QA pass — vision-grounded, no text-only guessing (the image itself IS the input). */
export async function runPhotoQa(params: {
  imageBase64: string;
  imageMediaType: PhotoQaMediaType;
  productName?: string;
}): Promise<{ data: PhotoQaResult; usage: AiUsage }> {
  const { data, usage } = await generateJsonFromImage<PhotoQaRawResult>({
    system: buildPhotoQaSystemPrompt(params.productName),
    instructionText: 'Analyze this product photo for an ecommerce listing.',
    imageBase64: params.imageBase64,
    imageMediaType: params.imageMediaType,
    schema: photoQaSchema,
    maxTokens: 500,
  });

  return {
    data: {
      qualityScore: resolveQualityScore(data.qualityScore),
      issues: Array.isArray(data.issues) ? data.issues : [],
      reshootSuggestions: Array.isArray(data.reshootSuggestions) ? data.reshootSuggestions : [],
      suggestedAltText: data.suggestedAltText ?? '',
      suggestedSeoDescription: data.suggestedSeoDescription ?? '',
    },
    usage,
  };
}
