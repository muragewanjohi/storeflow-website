/**
 * Blog Post Drafting — standalone "Draft with AI" endpoint for the blog
 * editor (blog-form-client.tsx). Mirrors src/app/api/pages/ai-legal-draft/
 * route.ts exactly: generate-then-save (Pattern A) — returns a draft, never
 * writes to the `blogs` table itself. The caller (the blog create/edit
 * screen) shows it in the form for explicit merchant review/edit before
 * they choose to save it.
 *
 * Distinct from the AI Assistant's `blog_draft` configuration_guidance
 * target (@/lib/assistant/shared.ts), which DOES create a real (draft-status)
 * blogs row directly — that path exists because a chat conversation has no
 * form to hand a draft back into; this button-driven path does, so it stays
 * generate-then-save like every other AI content tool in this app. Both
 * share the same generation core (@/lib/blog/blog-draft-shared.ts).
 *
 * Unlimited-by-design at the quota layer (see getAiFeatureLimit() in
 * subscriptions/limits.ts — 'blog_draft' isn't listed there, same category
 * as legal_page_draft's cost class) — rate-limited only via guardAiRequest.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { estimateCostUsd } from '@/lib/ai/claude-client';
import { recordAiUsage } from '@/lib/ai/usage';
import { guardAiRequest } from '@/lib/ai/guard';
import { getBusinessProfile } from '@/lib/tenant-context/business-profile';
import { runBlogDraft } from '@/lib/blog/blog-draft-shared';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  topic: z.string().min(1, 'Enter a topic for the blog post').max(500),
  bucket: z.enum(['setup', 'monthly']).default('monthly'),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const body = await request.json();
    const input = requestSchema.parse(body);

    const guard = await guardAiRequest(tenant, 'blog_draft', input.bucket);
    if (!guard.ok) return guard.response;

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
      bucket: input.bucket,
      usage,
      estimatedCost,
      itemCount: 1,
    });

    return NextResponse.json({
      title: data.title,
      content: data.content,
      excerpt: data.excerpt,
      meta_title: data.metaTitle,
      meta_description: data.metaDescription,
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

    console.error('[Blog AI Draft] Error:', error);
    return NextResponse.json(
      { error: 'AI drafting is temporarily unavailable. You can write the post manually instead.' },
      { status: 502 }
    );
  }
}
