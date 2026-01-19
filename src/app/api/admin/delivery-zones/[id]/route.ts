/**
 * Delivery Zone Management API (Admin)
 * 
 * PUT: Update delivery zone
 * DELETE: Delete delivery zone
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const deliveryZoneUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  price: z.number().min(0).optional(),
  locations: z.array(z.string().min(1)).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

/**
 * PUT /api/admin/delivery-zones/[id] - Update delivery zone
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin'], '/login');
    const { id } = await params;

    const body = await request.json();
    const validatedData = deliveryZoneUpdateSchema.parse(body);

    // Verify zone exists and belongs to tenant
    const existing = await prisma.delivery_zones.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Delivery zone not found' },
        { status: 404 }
      );
    }

    // Check for duplicate name if name is being updated
    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await prisma.delivery_zones.findFirst({
        where: {
          tenant_id: tenant.id,
          name: validatedData.name,
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A zone with this name already exists' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.delivery_zones.update({
      where: { id },
      data: {
        ...validatedData,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      zone: {
        id: updated.id,
        name: updated.name,
        price: Number(updated.price),
        locations: updated.locations,
        is_active: updated.is_active,
        sort_order: updated.sort_order,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error updating delivery zone:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update delivery zone' },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/admin/delivery-zones/[id] - Delete delivery zone
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin'], '/login');
    const { id } = await params;

    // Verify zone exists and belongs to tenant
    const existing = await prisma.delivery_zones.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Delivery zone not found' },
        { status: 404 }
      );
    }

    // Check if zone is used in any orders
    const ordersUsingZone = await prisma.orders.count({
      where: {
        tenant_id: tenant.id,
        delivery_zone_id: id,
      },
    });

    if (ordersUsingZone > 0) {
      return NextResponse.json(
        { error: 'Cannot delete zone that is used in existing orders. Deactivate it instead.' },
        { status: 400 }
      );
    }

    await prisma.delivery_zones.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Delivery zone deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting delivery zone:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete delivery zone' },
      { status: error.status || 500 }
    );
  }
}
