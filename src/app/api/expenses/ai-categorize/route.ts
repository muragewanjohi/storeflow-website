/**
 * Expense Auto-Categorization — AI Phase 2.1 (docs/AI_FEATURES_PLAN.md)
 *
 * Single-shot classification (generateJson, not conversational): given a
 * free-text expense description, Claude picks ONE category from the
 * tenant's real allow-list — the tenant's actual `expense_categories` names
 * plus the 7 platform-wide defaults (src/lib/finance/expense-categories.ts)
 * — never an invented one. "Miscellaneous" is always in that list, so there
 * is no "unclear" case here unlike the Dashboard Assistant's data_query:
 * every expense can be safely bucketed, and the merchant can always
 * override the suggestion before saving — this is generate-then-save
 * (Pattern A), it returns a suggestion only and never creates the expense
 * itself.
 *
 * The returned category name is deliberately compatible with the existing
 * resolveExpenseCategoryForTenant() (used by POST /api/expenses) with zero
 * translation needed — passing it straight through as `category` in that
 * endpoint's body slugifies it and matches it against the same
 * tenant-custom-or-default set this route builds its allow-list from.
 *
 * Quota-exempt (rate-limited only, 60/60s — see AI_RATE_LIMITS in
 * @/lib/ai/rate-limit) — this is a lightweight classification aid, not a
 * content-generation feature the merchant keeps. canUseAiFeature() has no
 * case for 'expense_categorization', which makes it unconditionally
 * allowed regardless of bucket; see getAiFeatureLimit() in
 * @/lib/subscriptions/limits.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { generateJson, estimateCostUsd } from '@/lib/ai/claude-client';
import { recordAiUsage } from '@/lib/ai/usage';
import { guardAiRequest } from '@/lib/ai/guard';
import { defaultExpenseCategories } from '@/lib/finance/expense-categories';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  description: z.string().min(1, 'A description is required').max(500),
  amount: z.number().positive().optional(),
});

const responseSchema = {
  type: 'object',
  properties: {
    category: { type: 'string' },
  },
  required: ['category'],
  additionalProperties: false,
} as const;

interface CategorizeResult {
  category: string;
}

function buildSystemPrompt(allowedNames: string[]): string {
  return [
    'You are an expense-categorization assistant for DukaNest, a Kenyan multi-tenant ecommerce platform.',
    "Given a merchant's free-text expense description (and optionally its amount in KES), pick the single best-fitting category.",
    `You must pick EXACTLY one of these category names, character-for-character: ${allowedNames.join(', ')}.`,
    'Never invent a category name that is not in this list. If nothing fits well, use "Miscellaneous".',
    'Return ONLY valid JSON with no markdown and no extra prose.',
  ].join(' ');
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const body = await request.json();
    const input = requestSchema.parse(body);

    const guard = await guardAiRequest(tenant, 'expense_categorization', 'monthly');
    if (!guard.ok) return guard.response;

    const tenantCategories = await prisma.expense_categories.findMany({
      where: { tenant_id: tenant.id },
      select: { name: true },
    });
    const allowedNames = Array.from(
      new Set([...tenantCategories.map((c) => c.name), ...defaultExpenseCategories.map((c) => c.name)])
    );

    const userContent = input.amount
      ? `Expense description: "${input.description}"\nAmount: KES ${input.amount}`
      : `Expense description: "${input.description}"`;

    const { data, usage } = await generateJson<CategorizeResult>({
      system: buildSystemPrompt(allowedNames),
      userContent,
      schema: responseSchema,
      maxTokens: 60,
    });

    // Defensive re-validation — don't trust the schema alone to have kept
    // Claude on the allow-list; fall back to the always-safe default.
    const category = allowedNames.includes(data.category) ? data.category : 'Miscellaneous';

    const estimatedCost = estimateCostUsd(usage);
    await recordAiUsage({
      tenantId: tenant.id,
      feature: 'expense_categorization',
      bucket: 'monthly',
      usage,
      estimatedCost,
      itemCount: 1,
    });

    return NextResponse.json({
      category,
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

    console.error('[Expense AI Categorization] Error:', error);
    return NextResponse.json(
      { error: 'AI categorization is temporarily unavailable. Please pick a category manually.' },
      { status: 502 }
    );
  }
}
