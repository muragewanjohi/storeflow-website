/**
 * Legal-Page Drafting (mobile/Flutter) — bearer-token mirror of
 * src/app/api/pages/ai-legal-draft/route.ts.
 *
 * Runs the EXACT same drafting prompt/schema as web, imported from
 * @/lib/legal-pages/legal-page-draft-shared — nothing about the Claude
 * prompt is reimplemented or forked for mobile. Generate-then-save, never
 * writes to or publishes a page itself — the Flutter page editor shows the
 * draft for explicit merchant review before saving.
 *
 * Real differences from the web route:
 *  1. Auth: requireMobileTenantStaff() (bearer token) instead of
 *     requireAuth()+requireTenant() (cookie session).
 *  2. Response envelope: mobileSuccess()/mobileError().
 *  3. No `bucket` — mobile always guards/records against 'setup', matching
 *     web's own default (a legal-page draft is normally a one-time setup
 *     action; mobile has no separate onboarding-era entry point that would
 *     need 'monthly' the way product_intake's web route does).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { estimateCostUsd } from '@/lib/ai/claude-client';
import { recordAiUsage } from '@/lib/ai/usage';
import { guardAiRequest } from '@/lib/ai/guard';
import { getBusinessProfile } from '@/lib/tenant-context/business-profile';
import { runLegalPageDraft, isLegalPageType } from '@/lib/legal-pages/legal-page-draft-shared';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  pageType: z.enum(['terms', 'privacy', 'returns']),
});

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenant } = gate.ctx;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid request',
          parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
        ),
        { status: 400 }
      );
    }
    const input = parsed.data;
    if (!isLegalPageType(input.pageType)) {
      return NextResponse.json(mobileError('VALIDATION_ERROR', 'Invalid pageType.'), { status: 400 });
    }

    const guard = await guardAiRequest(tenant, 'legal_page_draft', 'setup');
    if (!guard.ok) {
      const guardBody = await guard.response.json().catch(() => ({ error: 'Request blocked.' }));
      const status = guard.response.status;
      const code = status === 429 ? 'RATE_LIMITED' : 'FORBIDDEN';
      return NextResponse.json(mobileError(code, guardBody.error ?? 'Request blocked.'), { status });
    }

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
      bucket: 'setup',
      usage,
      estimatedCost,
      itemCount: 1,
    });

    return NextResponse.json(
      mobileSuccess({
        title: data.title,
        contentHtml: data.contentHtml,
        usage: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          estimatedCostUsd: estimatedCost,
        },
      })
    );
  } catch (error) {
    console.error('[Mobile Legal Page AI Draft] Error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'AI drafting is temporarily unavailable. You can write the page manually instead.'),
      { status: 502 }
    );
  }
}
