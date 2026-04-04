import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { updateAttributeSchema } from '@/lib/attributes/validation';

async function loadAttribute(tenantId: string, id: string) {
  return prisma.attributes.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      attribute_values: {
        orderBy: { value: 'asc' },
      },
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const attribute = await loadAttribute(tenantId, id);
    if (!attribute) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Attribute not found'), { status: 404 });
    }
    return NextResponse.json(mobileSuccess({ attribute }), { status: 200 });
  } catch (e) {
    console.error('[Mobile attribute GET]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch attribute'), { status: 500 });
  }
}

async function mutateAttribute(request: NextRequest, params: Promise<{ id: string }>) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const body = await request.json();
    const validatedData = updateAttributeSchema.parse(body);

    const hasField = ['name', 'slug', 'type'].some(
      (key) => validatedData[key as keyof typeof validatedData] !== undefined,
    );
    if (!hasField) {
      return NextResponse.json(mobileError('VALIDATION_ERROR', 'No fields to update'), { status: 400 });
    }

    const existing = await prisma.attributes.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Attribute not found'), { status: 404 });
    }

    const updateData: Prisma.attributesUpdateInput = { updated_at: new Date() };
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.slug !== undefined) updateData.slug = validatedData.slug;
    if (validatedData.type !== undefined) updateData.type = validatedData.type;

    const attribute = await prisma.attributes.update({
      where: { id },
      data: updateData,
      include: {
        attribute_values: {
          orderBy: { value: 'asc' },
        },
      },
    });

    return NextResponse.json(mobileSuccess({ attribute }), { status: 200 });
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
    console.error('[Mobile attribute PUT/PATCH]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update attribute'), { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return mutateAttribute(request, context.params);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return mutateAttribute(request, context.params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const existing = await prisma.attributes.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Attribute not found'), { status: 404 });
    }

    await prisma.attributes.delete({ where: { id } });
    return NextResponse.json(mobileSuccess({ deleted: true }), { status: 200 });
  } catch (e) {
    console.error('[Mobile attribute DELETE]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete attribute'), { status: 500 });
  }
}
