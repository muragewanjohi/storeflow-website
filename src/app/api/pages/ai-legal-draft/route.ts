/**
 * Legal-Page Drafting — AI Phase 7.2 (docs/AI_FEATURES_PLAN.md)
 *
 * Generate-then-save (Pattern A): returns a draft title + simple semantic
 * HTML for terms/privacy/returns — never writes to the `pages` table
 * itself, and never publishes anything. The caller (the page create/edit
 * screen) shows it in the editor for explicit merchant review/edit before
 * they choose to save it, same as every other AI-generated draft in this
 * app (product descriptions, category suggestions, etc.).
 *
 * Setup-bucket quota by default (docs/AI_FEATURES_PLAN.md: 3 legal-page
 * drafts per store setup) — 'monthly' is always allowed too (undefined cap,
 * see getAiFeatureLimit()) for a later redraft, just not what a frontend
 * bug should accidentally default to draining.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { estimateCostUsd } from '@/lib/ai/claude-client';
import { recordAiUsage } from '@/lib/ai/usage';
import { guardAiRequest } from '@/lib/ai/guard';
import { getBusinessProfile } from '@/lib/tenant-context/business-profile';
import { runLegalPageDraft, isLegalPageType } from '@/lib/legal-pages/legal-page-draft-shared';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  pageType: z.enum(['terms', 'privacy', 'returns']),
  bucket: z.enum(['setup', 'monthly']).default('setup'),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const body = await request.json();
    const input = requestSchema.parse(body);
    if (!isLegalPageType(input.pageType)) {
      return NextResponse.json({ error: 'Invalid pageType.' }, { status: 400 });
    }

    const guard = await guardAiRequest(tenant, 'legal_page_draft', input.bucket);
    if (!guard.ok) return guard.response;

    const { businessType, niche } = getBusinessProfile(tenant);
    const { data, usage } = await runLegalPageDraft({
      pageType: input.pageType,
      storeName: tenant.name,
      businessType,
      niche,
    });

    const estimatedCost = estimateCostUsd(usage);
    await recordAiUsage({
      tenantId: tenant.id,
      feature: 'legal_page_draft',
      bucket: input.bucket,
      usage,
      estimatedCost,
      itemCount: 1,
    });

    return NextResponse.json({
      title: data.title,
      contentHtml: data.contentHtml,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostUsd: estimatedCost,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Tenant not found') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    console.error('[Legal Page AI Draft] Error:', error);
    return NextResponse.json(
      { error: 'AI drafting is temporarily unavailable. You can write the page manually instead.' },
      { status: 502 }
    );
  }
}
