import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';

const deliveryZoneSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  locations: z.array(z.string().min(1)).min(1),
  is_active: z.boolean().optional().default(true),
  sort_order: z.number().int().optional().default(0),
});

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;

  try {
    const zones = await prisma.delivery_zones.findMany({
      where: { tenant_id: tenantId },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(
      mobileSuccess({
        items: zones.map((zone) => ({
          id: zone.id,
          name: zone.name,
          price: Number(zone.price),
          locations: zone.locations,
          isActive: zone.is_active,
          sortOrder: zone.sort_order,
          createdAt: zone.created_at?.toISOString() ?? null,
          updatedAt: zone.updated_at?.toISOString() ?? null,
        })),
      }),
      { status: 200 },
    );
  } catch (e) {
    console.error('[Mobile delivery-zones GET]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch delivery zones'), {
      status: 500,
    });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  if (gate.ctx.user.role !== 'tenant_admin') {
    return NextResponse.json(
      mobileError('FORBIDDEN', 'Only the store owner can create delivery zones'),
      { status: 403 },
    );
  }

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;

  try {
    const body = await request.json();
    const validatedData = deliveryZoneSchema.parse(body);

    const existing = await prisma.delivery_zones.findFirst({
      where: { tenant_id: tenantId, name: validatedData.name },
    });
    if (existing) {
      return NextResponse.json(mobileError('CONFLICT', 'A zone with this name already exists'), {
        status: 409,
      });
    }

    const zone = await prisma.delivery_zones.create({
      data: {
        tenant_id: tenantId,
        name: validatedData.name,
        price: validatedData.price,
        locations: validatedData.locations,
        is_active: validatedData.is_active,
        sort_order: validatedData.sort_order,
      },
    });

    return NextResponse.json(
      mobileSuccess({
        zone: {
          id: zone.id,
          name: zone.name,
          price: Number(zone.price),
          locations: zone.locations,
          isActive: zone.is_active,
          sortOrder: zone.sort_order,
          createdAt: zone.created_at?.toISOString() ?? null,
          updatedAt: zone.updated_at?.toISOString() ?? null,
        },
      }),
      { status: 201 },
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
    console.error('[Mobile delivery-zones POST]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to create zone'), { status: 500 });
  }
}
