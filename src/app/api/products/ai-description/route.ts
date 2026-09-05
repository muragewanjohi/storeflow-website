/**
 * AI Product Description Generator — single product
 *
 * AI Phase 1.2 (docs/AI_FEATURES_PLAN.md). Generate-then-save pattern: this
 * route only returns generated text — it does not write to the products
 * table itself. The caller (product create/edit screen) decides whether to
 * save it, same separation as every other AI feature in this app.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { generateJson, estimateCostUsd } from '@/lib/ai/claude-client';
import { recordAiUsage } from '@/lib/ai/usage';
import { guardAiRequest } from '@/lib/ai/guard';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  categoryId: z.string().uuid().optional(),
  price: z.number().positive().optional(),
  existingDescription: z.string().optional(),
  bucket: z.enum(['setup', 'monthly']).default('monthly'),
});

const responseSchema = {
  type: 'object',
  properties: {
    description: { type: 'string' },
    short_description: { type: 'string' },
  },
  required: ['description', 'short_description'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = [
  'You are an ecommerce copywriter for DukaNest, a Kenyan multi-tenant storefront platform.',
  'Return ONLY valid JSON with no markdown and no extra prose.',
  'Write a compelling product description (80-120 words) and a short_description (max 160 characters, suitable for search/listing previews).',
  'Be specific to the product given — do not use generic filler like "great quality" without justification.',
  'Do not invent features, materials, or specifications not implied by the product name, category, or price.',
].join(' ');

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const body = await request.json();
    const input = requestSchema.parse(body);

    const guard = await guardAiRequest(tenant, 'product_description', input.bucket);
    if (!guard.ok) return guard.response;

    let categoryName: string | undefined;
    if (input.categoryId) {
      const category = await prisma.categories.findFirst({
        where: { id: input.categoryId, tenant_id: tenant.id },
        select: { name: true },
      });
      categoryName = category?.name;
    }

    const userContent = [
      `Product name: "${input.name}".`,
      categoryName ? `Category: ${categoryName}.` : undefined,
      input.price !== undefined ? `Price: KES ${input.price}.` : undefined,
      input.existingDescription
        ? `Existing description to improve on (rewrite, don't just repeat): "${input.existingDescription}"`
        : undefined,
    ]
      .filter(Boolean)
      .join('\n');

    const { data, usage } = await generateJson<{ description: string; short_description: string }>({
      system: SYSTEM_PROMPT,
      userContent,
      schema: responseSchema,
      maxTokens: 500,
    });

    const estimatedCost = estimateCostUsd(usage);
    await recordAiUsage({
      tenantId: tenant.id,
      feature: 'product_description',
      bucket: input.bucket,
      usage,
      estimatedCost,
      itemCount: 1,
    });

    return NextResponse.json({
      description: data.description,
      shortDescription: data.short_description,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostUsd: estimatedCost,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Tenant not found') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    console.error('[AI Product Description] Error:', error);
    return NextResponse.json(
      { error: 'AI description generation is temporarily unavailable. You can still write a description manually.' },
      { status: 502 }
    );
  }
}
