import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { createAttributeValueSchema } from '@/lib/attributes/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;
  const { id: attributeId } = await params;

  try {
    const attribute = await prisma.attributes.findFirst({
      where: { id: attributeId, tenant_id: tenantId },
    });
    if (!attribute) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Attribute not found'), { status: 404 });
    }

    const values = await prisma.attribute_values.findMany({
      where: { attribute_id: attributeId, tenant_id: tenantId },
      orderBy: { value: 'asc' },
    });

    return NextResponse.json(mobileSuccess({ items: values }), { status: 200 });
  } catch (e) {
    console.error('[Mobile attribute values GET]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to list values'), { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id: attributeId } = await params;

  try {
    const attribute = await prisma.attributes.findFirst({
      where: { id: attributeId, tenant_id: tenantId },
    });
    if (!attribute) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Attribute not found'), { status: 404 });
    }

    const body = await request.json();
    const validatedData = createAttributeValueSchema.parse(body);

    const value = await prisma.attribute_values.create({
      data: {
        tenant_id: tenantId,
        attribute_id: attributeId,
        value: validatedData.value,
        color_code: validatedData.color_code || null,
      },
    });

    return NextResponse.json(mobileSuccess({ value }), { status: 201 });
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
    console.error('[Mobile attribute values POST]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to create value'), { status: 500 });
  }
}
