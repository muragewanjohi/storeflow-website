import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { createAttributeSchema } from '@/lib/attributes/validation';

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;

  try {
    const attributes = await prisma.attributes.findMany({
      where: { tenant_id: tenantId },
      include: {
        attribute_values: {
          select: {
            id: true,
            value: true,
            color_code: true,
            created_at: true,
          },
          orderBy: { value: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(mobileSuccess({ items: attributes }), { status: 200 });
  } catch (e) {
    console.error('[Mobile attributes GET]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to list attributes'), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;

  try {
    const body = await request.json();
    const validatedData = createAttributeSchema.parse(body);
    const slug = validatedData.slug || validatedData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const attribute = await prisma.attributes.create({
      data: {
        tenant_id: tenantId,
        name: validatedData.name,
        slug,
        type: validatedData.type || null,
      },
      include: {
        attribute_values: {
          select: { id: true, value: true, color_code: true, created_at: true },
          orderBy: { value: 'asc' },
        },
      },
    });

    return NextResponse.json(mobileSuccess({ attribute }), { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid body',
          e.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        ),
        { status: 400 },
      );
    }
    console.error('[Mobile attributes POST]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to create attribute'), { status: 500 });
  }
}
