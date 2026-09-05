import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { updateAttributeValueSchema } from '@/lib/attributes/validation';

async function mutateValue(
  request: NextRequest,
  params: Promise<{ id: string; valueId: string }>,
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id: attributeId, valueId } = await params;

  try {
    const body = await request.json();
    const validatedData = updateAttributeValueSchema.parse(body);

    const hasField = ['value', 'color_code'].some(
      (key) => validatedData[key as keyof typeof validatedData] !== undefined,
    );
    if (!hasField) {
      return NextResponse.json(mobileError('VALIDATION_ERROR', 'No fields to update'), { status: 400 });
    }

    const existing = await prisma.attribute_values.findFirst({
      where: {
        id: valueId,
        attribute_id: attributeId,
        tenant_id: tenantId,
      },
    });
    if (!existing) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Attribute value not found'), { status: 404 });
    }

    const updateData: Prisma.attribute_valuesUpdateInput = {};
    if (validatedData.value !== undefined) updateData.value = validatedData.value;
    if (validatedData.color_code !== undefined) updateData.color_code = validatedData.color_code;

    const value = await prisma.attribute_values.update({
      where: { id: valueId },
      data: updateData,
    });

    return NextResponse.json(mobileSuccess({ value }), { status: 200 });
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
    console.error('[Mobile attribute value PUT/PATCH]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update value'), { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; valueId: string }> },
) {
  return mutateValue(request, context.params);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; valueId: string }> },
) {
  return mutateValue(request, context.params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; valueId: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id: attributeId, valueId } = await params;

  try {
    const existing = await prisma.attribute_values.findFirst({
      where: {
        id: valueId,
        attribute_id: attributeId,
        tenant_id: tenantId,
      },
    });
    if (!existing) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Attribute value not found'), { status: 404 });
    }

    await prisma.attribute_values.delete({ where: { id: valueId } });
    return NextResponse.json(mobileSuccess({ deleted: true }), { status: 200 });
  } catch (e) {
    console.error('[Mobile attribute value DELETE]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete value'), { status: 500 });
  }
}
