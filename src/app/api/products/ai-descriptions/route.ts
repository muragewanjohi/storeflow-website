/**
 * AI Product Description Generator — batched
 *
 * AI Phase 1.3 (docs/AI_FEATURES_PLAN.md). Batches up to 10 products into
 * one Claude call, matching the batching pattern already used by the
 * onboarding Store Starter Pack (Gemini) — amortizes the fixed system-prompt
 * overhead across N products instead of paying it N times (~25% cheaper
 * than N calls to /api/products/ai-description, per the cost modeling in
 * the plan doc). Generate-then-save: returns text only, does not write to
 * the products table.
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

const MAX_BATCH_SIZE = 10;

const requestSchema = z.object({
  products: z
    .array(
      z.object({
        name: z.string().min(1, 'Product name is required'),
        categoryId: z.string().uuid().optional(),
        price: z.number().positive().optional(),
      })
    )
    .min(1, 'At least one product is required')
    .max(MAX_BATCH_SIZE, `At most ${MAX_BATCH_SIZE} products per batch`),
  bucket: z.enum(['setup', 'monthly']).default('monthly'),
});

const responseSchema = {
  type: 'object',
  properties: {
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          short_description: { type: 'string' },
        },
        required: ['name', 'description', 'short_description'],
        additionalProperties: false,
      },
    },
  },
  required: ['products'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = [
  'You are an ecommerce copywriter for DukaNest, a Kenyan multi-tenant storefront platform.',
  'Return ONLY valid JSON with no markdown and no extra prose.',
  'For every product in the input, write a compelling description (80-120 words) and a short_description (max 160 characters, suitable for search/listing previews).',
  'Return exactly one output entry per input product, in the same order, with the "name" field echoed back unchanged so the caller can match results to inputs.',
  'Be specific to each product — do not use generic filler like "great quality" without justification, and do not let one product\'s copy bleed into another\'s.',
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

    const categoryIds = Array.from(
      new Set(input.products.map((p) => p.categoryId).filter((id): id is string => !!id))
    );
    const categories = categoryIds.length
      ? await prisma.categories.findMany({
          where: { id: { in: categoryIds }, tenant_id: tenant.id },
          select: { id: true, name: true },
        })
      : [];
    const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

    const userContent = input.products
      .map((p, i) => {
        const parts = [`${i + 1}. Name: "${p.name}"`];
        const categoryName = p.categoryId ? categoryNameById.get(p.categoryId) : undefined;
        if (categoryName) parts.push(`Category: ${categoryName}`);
        if (p.price !== undefined) parts.push(`Price: KES ${p.price}`);
        return parts.join(', ');
      })
      .join('\n');

    const { data, usage } = await generateJson<{
      products: Array<{ name: string; description: string; short_description: string }>;
    }>({
      system: SYSTEM_PROMPT,
      userContent: `Generate descriptions for these ${input.products.length} products:\n${userContent}`,
      schema: responseSchema,
      maxTokens: 400 + input.products.length * 250,
    });

    const estimatedCost = estimateCostUsd(usage);
    await recordAiUsage({
      tenantId: tenant.id,
      feature: 'product_description',
      bucket: input.bucket,
      usage,
      estimatedCost,
      itemCount: data.products.length,
    });

    return NextResponse.json({
      products: data.products.map((p) => ({
        name: p.name,
        description: p.description,
        shortDescription: p.short_description,
      })),
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

    console.error('[AI Product Descriptions Batch] Error:', error);
    return NextResponse.json(
      { error: 'AI description generation is temporarily unavailable. You can still write descriptions manually.' },
      { status: 502 }
    );
  }
}
