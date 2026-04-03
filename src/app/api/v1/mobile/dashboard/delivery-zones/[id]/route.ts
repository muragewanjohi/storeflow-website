import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';

const deliveryZoneUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  price: z.number().min(0).optional(),
  locations: z.array(z.string().min(1)).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  if (gate.ctx.user.role !== 'tenant_admin') {
    return NextResponse.json(
      mobileError('FORBIDDEN', 'Only the store owner can update delivery zones'),
      { status: 403 },
    );
  }
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const body = await request.json();
    const validatedData = deliveryZoneUpdateSchema.parse(body);

    const existing = await prisma.delivery_zones.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Delivery zone not found'), { status: 404 });
    }

    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await prisma.delivery_zones.findFirst({
        where: { tenant_id: tenantId, name: validatedData.name, id: { not: id } },
      });
      if (duplicate) {
        return NextResponse.json(mobileError('CONFLICT', 'A zone with this name already exists'), {
          status: 409,
        });
      }
    }

    const updated = await prisma.delivery_zones.update({
      where: { id },
      data: {
        ...validatedData,
        updated_at: new Date(),
      },
    });

    return NextResponse.json(
      mobileSuccess({
        zone: {
          id: updated.id,
          name: updated.name,
          price: Number(updated.price),
          locations: updated.locations,
          isActive: updated.is_active,
          sortOrder: updated.sort_order,
          updatedAt: updated.updated_at?.toISOString() ?? null,
        },
      }),
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Validation error',
          e.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        ),
        { status: 400 },
      );
    }
    console.error('[Mobile delivery-zone PUT]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update zone'), { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return PUT(request, ctx);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  if (gate.ctx.user.role !== 'tenant_admin') {
    return NextResponse.json(
      mobileError('FORBIDDEN', 'Only the store owner can delete delivery zones'),
      { status: 403 },
    );
  }
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const existing = await prisma.delivery_zones.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Delivery zone not found'), { status: 404 });
    }

    const ordersUsingZone = await prisma.orders.count({
      where: { tenant_id: tenantId, delivery_zone_id: id },
    });
    if (ordersUsingZone > 0) {
      return NextResponse.json(
        mobileError(
          'BAD_REQUEST',
          'Cannot delete zone used in existing orders. Deactivate it instead.',
        ),
        { status: 400 },
      );
    }

    await prisma.delivery_zones.delete({ where: { id } });

    return NextResponse.json(mobileSuccess({ message: 'Delivery zone deleted' }), { status: 200 });
  } catch (e) {
    console.error('[Mobile delivery-zone DELETE]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete zone'), { status: 500 });
  }
}
