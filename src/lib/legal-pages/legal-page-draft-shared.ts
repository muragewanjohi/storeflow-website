/**
 * Legal-Page Drafting — shared core (AI Phase 7.2, docs/AI_FEATURES_PLAN.md),
 * used by BOTH the web route (src/app/api/pages/ai-legal-draft/route.ts) and
 * the mobile route (src/app/api/v1/mobile/pages/ai-legal-draft/route.ts).
 *
 * "AI drafts default terms/privacy/returns text from store type + locale;
 * UI requires explicit merchant review/edit before the page can be
 * published (not a silent auto-publish)" (AI_FEATURES_PLAN.md Phase 7).
 * Generate-then-save, same Pattern A as every other content-generation
 * feature in this app — this endpoint only returns draft text, it never
 * writes to the `pages` table itself. The caller (page create/edit screen)
 * decides whether to save it, and as what status (draft, never
 * auto-published).
 */

import { generateJson, type AiUsage } from '@/lib/ai/claude-client';

export const LEGAL_PAGE_TYPES = ['terms', 'privacy', 'returns'] as const;
export type LegalPageType = (typeof LEGAL_PAGE_TYPES)[number];

export function isLegalPageType(value: string): value is LegalPageType {
  return (LEGAL_PAGE_TYPES as readonly string[]).includes(value);
}

const LEGAL_PAGE_TYPE_LABELS: Record<LegalPageType, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  returns: 'Returns & Refunds Policy',
};

export const legalPageDraftSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    // Simple semantic HTML (h2/h3/p/ul/li only) — matches what the rich-text
    // editor (RichTextEditor, page-form-client.tsx 'rich-text' content mode)
    // already renders/edits for every other simple page.
    contentHtml: { type: 'string' },
  },
  required: ['title', 'contentHtml'],
  additionalProperties: false,
} as const;

export interface LegalPageDraftResult {
  title: string;
  contentHtml: string;
}

function buildLegalPageDraftSystemPrompt(params: {
  pageType: LegalPageType;
  storeName: string;
  businessType: string | null;
  niche: string | null;
  locale: string;
}): string {
  const businessContext = params.businessType
    ? `The store's recorded business type is "${params.businessType}"${params.niche ? ` and its niche is "${params.niche}"` : ''}.`
    : 'No specific business type is recorded for this store — keep the draft generic enough to fit any small ecommerce store.';

  return [
    `You are drafting a ${LEGAL_PAGE_TYPE_LABELS[params.pageType]} page for "${params.storeName}", a store on DukaNest, a Kenyan multi-tenant ecommerce platform (locale: ${params.locale}).`,
    businessContext,
    'This is a REASONABLE DEFAULT DRAFT the merchant will review and edit before publishing — not final legal advice, and you must make that clear within the content itself (a short opening note that this is a starting template the merchant should review, and adjust or have reviewed by a professional if needed for their specific situation).',
    'Cover the sections a real small Kenyan ecommerce store would need for this page type: for Terms of Service — acceptance of terms, use of the site, orders/payments, pricing, user conduct, limitation of liability, governing law (Kenya). For Privacy Policy — what data is collected, how it is used, cookies, third-party services (payment processors like M-Pesa/Pesapal), data retention, contact for privacy questions, reference to the Kenya Data Protection Act 2019. For Returns & Refunds Policy — return window, condition requirements, how to initiate a return, refund method/timing, non-returnable items, exchange policy.',
    'Never invent a specific fact about THIS store that you do not actually know (no fake phone number, physical address, registration number, or specific timeframe presented as fact) — use clearly-marked bracketed placeholders instead (e.g. "[Insert your business contact email]", "[Insert your return window, e.g. 7 days]") for anything store-specific the merchant must fill in themselves.',
    'Output simple semantic HTML for contentHtml: <h2>/<h3> section headings, <p> paragraphs, <ul>/<li> lists where useful. No inline styles, no <script>, no markdown syntax mixed in.',
    'title should be a short page title (e.g. "Terms of Service").',
    'Return ONLY valid JSON with no markdown and no extra prose.',
  ].join(' ');
}

export async function runLegalPageDraft(params: {
  pageType: LegalPageType;
  storeName: string;
  businessType: string | null;
  niche: string | null;
  locale?: string;
}): Promise<{ data: LegalPageDraftResult; usage: AiUsage }> {
  const locale = params.locale || 'en-KE';
  return generateJson<LegalPageDraftResult>({
    system: buildLegalPageDraftSystemPrompt({
      pageType: params.pageType,
      storeName: params.storeName,
      businessType: params.businessType,
      niche: params.niche,
      locale,
    }),
    userContent: `Draft the ${LEGAL_PAGE_TYPE_LABELS[params.pageType]} page for "${params.storeName}".`,
    schema: legalPageDraftSchema,
    maxTokens: 2000,
  });
}
