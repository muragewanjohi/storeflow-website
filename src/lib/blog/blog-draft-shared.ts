/**
 * Blog Post Drafting — shared core, used by the standalone "Draft with AI"
 * endpoints (src/app/api/blogs/ai-draft/route.ts,
 * src/app/api/v1/mobile/dashboard/blogs/ai-draft/route.ts) AND the AI
 * Assistant's `configuration_guidance` target `blog_draft`
 * (@/lib/assistant/shared.ts's handleBlogDraftConfigTarget) — one
 * generation core, two entry points, same discipline as
 * legal-page-draft-shared.ts (AI Phase 7.2).
 *
 * Generate-then-save (Pattern A) for the standalone button: returns a draft,
 * never writes to `blogs` itself, the merchant reviews/edits before saving.
 * The assistant's config-target path is the one exception in this app to
 * "never let chat create long-form content unreviewed" — but it already has
 * precedent (handleSalesConfigTarget creates a real `status: 'draft'` sale
 * record directly) — a blog draft created this way is ALSO always
 * `status: 'draft'`, never published, and the assistant always links back to
 * the edit screen for review — never a silent auto-publish either way.
 */

import { generateJson, type AiUsage } from '@/lib/ai/claude-client';

export const blogDraftSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    // Simple semantic HTML (h2/h3/p/ul/li/strong/em only) — matches what
    // the blog content editor renders/edits.
    content: { type: 'string' },
    // Short (1-2 sentence) summary shown on blog listing pages.
    excerpt: { type: 'string' },
    metaTitle: { type: 'string' },
    metaDescription: { type: 'string' },
  },
  required: ['title', 'content', 'excerpt', 'metaTitle', 'metaDescription'],
  additionalProperties: false,
} as const;

export interface BlogDraftResult {
  title: string;
  content: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
}

function buildBlogDraftSystemPrompt(params: {
  storeName: string;
  businessType: string | null;
  niche: string | null;
}): string {
  const businessContext = params.businessType
    ? `The store's recorded business type is "${params.businessType}"${params.niche ? ` and its niche is "${params.niche}"` : ''} — write with that audience in mind.`
    : 'No specific business type is recorded for this store — keep the post generic enough to fit any small ecommerce store.';

  return [
    `You are drafting a blog post for "${params.storeName}", a store on DukaNest, a Kenyan multi-tenant ecommerce platform.`,
    businessContext,
    'This is a DRAFT the merchant will review and edit before publishing — write it as a genuinely useful, publish-ready post on the given topic, not a placeholder or outline.',
    'Never invent a specific fact about THIS store that you do not actually know (no fake statistics, testimonials, dates, prices, or specific product names unless the merchant\'s topic names one) — write in general, genuinely helpful terms instead.',
    'Output simple semantic HTML for content: <h2>/<h3> section headings, <p> paragraphs, <ul>/<li> lists, <strong>/<em> for emphasis where useful. No inline styles, no <script>, no markdown syntax mixed in. Aim for roughly 300-600 words — a real, substantial post, not a stub.',
    'title should be a short, engaging blog post title (not the topic verbatim, unless it already reads well as a title).',
    'excerpt should be a 1-2 sentence summary suitable for a blog listing card.',
    'metaTitle should be an SEO-friendly page title (can match title, or be a slightly shorter variant), under 60 characters. metaDescription should be an SEO meta description, under 160 characters.',
    'Return ONLY valid JSON with no markdown and no extra prose.',
  ].join(' ');
}

export async function runBlogDraft(params: {
  topic: string;
  storeName: string;
  businessType: string | null;
  niche: string | null;
}): Promise<{ data: BlogDraftResult; usage: AiUsage }> {
  return generateJson<BlogDraftResult>({
    system: buildBlogDraftSystemPrompt({
      storeName: params.storeName,
      businessType: params.businessType,
      niche: params.niche,
    }),
    userContent: `Write a blog post about: ${params.topic.trim()}`,
    schema: blogDraftSchema,
    maxTokens: 2500,
  });
}
