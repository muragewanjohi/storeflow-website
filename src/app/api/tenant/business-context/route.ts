/**
 * Save the merchant's business context (businessType, niche) collected by
 * the Onboarding AI Chat (OC.1/OC.2, docs/ONBOARDING_AI_CHAT_PLAN.md).
 *
 * Deliberately narrow: this route ONLY merges `business_type`/`niche` into
 * `tenants.data` (the same JSON field POST /api/tenants/register already
 * writes `business_type`/`selling` into — see that route's registration
 * handler). It does NOT re-trigger starter-pack content generation — that
 * pipeline (POST /api/onboarding/starter-pack, ~1700 lines with background-
 * job fallbacks) has not been verified safe to call a second time for an
 * already-provisioned tenant, so re-running it automatically here risked
 * duplicate products/categories or wasted Gemini cost. The saved context is
 * for future AI personalization (product descriptions, marketing tone) —
 * regenerating/enriching the actual demo catalog from it is a deliberately
 * separate follow-up, not bundled into this endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  businessType: z.string().min(1).max(255).optional(),
  niche: z.string().min(1).max(255).optional(),
}).refine((v) => Boolean(v.businessType || v.niche), {
  message: 'businessType or niche is required',
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();

    const body = await request.json();
    const input = requestSchema.parse(body);

    const current = await prisma.tenants.findUnique({
      where: { id: tenant.id },
      select: { data: true },
    });
    const existingData = isRecord(current?.data) ? current.data : {};

    const updated = await prisma.tenants.update({
      where: { id: tenant.id },
      data: {
        data: {
          ...existingData,
          ...(input.businessType ? { business_type: input.businessType } : {}),
          ...(input.niche ? { niche: input.niche } : {}),
        },
      },
      select: { data: true },
    });

    return NextResponse.json({ success: true, data: updated.data });
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

    console.error('[Tenant Business Context] Error:', error);
    return NextResponse.json({ error: 'Failed to save business context.' }, { status: 500 });
  }
}
