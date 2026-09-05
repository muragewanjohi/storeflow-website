/**
 * Save the merchant's business context (businessType, niche) collected by
 * the mobile Onboarding AI Chat (OC.3) — bearer-token mirror of
 * PATCH /api/tenant/business-context. Same narrow scope as web: merges
 * business_type/niche into tenants.data only, does NOT re-trigger
 * starter-pack content generation. See that route's docblock for the full
 * reasoning; the merge logic itself lives in
 * @/lib/onboarding/chat-shared's mergeBusinessContext() and is shared, not
 * re-implemented here.
 *
 * Also exposes GET, which the web server component doesn't need (it reads
 * tenant.data directly via a Prisma call in page.tsx, a Next.js server
 * component) but the Flutter chat screen does — it needs a real request to
 * pre-seed knownBusinessType/knownNiche before starting the conversation.
 * Kept on this same narrow route rather than widening the shared, heavily-
 * used GET /api/v1/mobile/auth/me session-restore endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { prisma } from '@/lib/prisma/client';
import { mergeBusinessContext } from '@/lib/onboarding/chat-shared';

export const dynamic = 'force-dynamic';

const requestSchema = z
  .object({
    businessType: z.string().min(1).max(255).optional(),
    niche: z.string().min(1).max(255).optional(),
  })
  .refine((v) => Boolean(v.businessType || v.niche), {
    message: 'businessType or niche is required',
  });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenant } = gate.ctx;

  const data = isRecord(tenant.data) ? tenant.data : {};
  const businessType = typeof data.business_type === 'string' ? data.business_type : null;
  const niche = typeof data.niche === 'string' ? data.niche : null;

  return NextResponse.json(mobileSuccess({ storeName: tenant.name, businessType, niche }));
}

export async function PATCH(request: NextRequest) {
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

    const current = await prisma.tenants.findUnique({
      where: { id: tenant.id },
      select: { data: true },
    });

    const updated = await prisma.tenants.update({
      where: { id: tenant.id },
      data: {
        data: mergeBusinessContext(current?.data, input),
      },
      select: { data: true },
    });

    return NextResponse.json(mobileSuccess({ data: updated.data }));
  } catch (error) {
    console.error('[Mobile Tenant Business Context] Error:', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to save business context.'), { status: 500 });
  }
}
