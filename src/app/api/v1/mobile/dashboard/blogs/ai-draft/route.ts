/**
 * Blog Post Drafting (mobile/Flutter) — bearer-token mirror of
 * src/app/api/blogs/ai-draft/route.ts.
 *
 * Runs the EXACT same drafting prompt/schema as web, imported from
 * @/lib/blog/blog-draft-shared — nothing about the Claude prompt is
 * reimplemented or forked for mobile. Generate-then-save, never writes to
 * the `blogs` table itself — the Flutter blog editor (blog_post_editor_
 * screen.dart) shows the draft for explicit merchant review before saving.
 *
 * Real differences from the web route:
 *  1. Auth: requireMobileTenantStaff() (bearer token) instead of
 *     requireAuth()+requireTenant() (cookie session).
 *  2. Response envelope: mobileSuccess()/mobileError().
 *  3. Bucket always 'monthly' — matches web's own default (unlike legal-page
 *     drafts, a merchant may reasonably want more than one blog post over
 *     time, not just at initial setup).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { estimateCostUsd } from '@/lib/ai/claude-client';
import { recordAiUsage } from '@/lib/ai/usage';
import { guardAiRequest } from '@/lib/ai/guard';
import { getBusinessProfile } from '@/lib/tenant-context/business-profile';
import { runBlogDraft } from '@/lib/blog/blog-draft-shared';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  topic: z.string().min(1, 'Enter a topic for the blog post').max(500),
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

    const guard = await guardAiRequest(tenant, 'blog_draft', 'monthly');
    if (!guard.ok) {
      const guardBody = await guard.response.json().catch(() => ({ error: 'Request blocked.' }));
      const status = guard.response.status;
      const code = status === 429 ? 'RATE_LIMITED' : 'FORBIDDEN';
      return NextResponse.json(mobileError(code, guardBody.error ?? 'Request blocked.'), { status });
    }

    const { businessType, niche } = getBusinessProfile(tenant);
    const { data, usage } = await runBlogDraft({
      topic: input.topic,
      storeName: tenant.name,
      businessType,
      niche,
    });

    const estimatedCost = estimateCostUsd(usage);
    await recordAiUsage({
      tenantId: tenant.id,
      feature: 'blog_draft',
      bucket: 'monthly',
      usage,
      estimatedCost,
      itemCount: 1,
    });

    return NextResponse.json(
      mobileSuccess({
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        usage: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          estimatedCostUsd: estimatedCost,
        },
      })
    );
  } catch (error) {
    console.error('[Mobile Blog AI Draft] Error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'AI drafting is temporarily unavailable. You can write the post manually instead.'),
      { status: 502 }
    );
  }
}
