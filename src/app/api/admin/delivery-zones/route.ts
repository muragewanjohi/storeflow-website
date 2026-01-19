/**
 * Delivery Zones Management API (Admin)
 * 
 * GET: List all delivery zones
 * POST: Create new delivery zone
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const deliveryZoneSchema = z.object({
  name: z.string().min(1, 'Zone name is required').max(100),
  price: z.number().min(0, 'Price must be positive'),
  locations: z.array(z.string().min(1)).min(1, 'At least one location is required'),
  is_active: z.boolean().optional().default(true),
  sort_order: z.number().int().optional().default(0),
});

/**
 * GET /api/admin/delivery-zones - List all delivery zones
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

    const zones = await prisma.delivery_zones.findMany({
      where: {
        tenant_id: tenant.id,
      },
      orderBy: [
        { sort_order: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      zones: zones.map(zone => ({
        id: zone.id,
        name: zone.name,
        price: Number(zone.price),
        locations: zone.locations,
        is_active: zone.is_active,
        sort_order: zone.sort_order,
        created_at: zone.created_at,
        updated_at: zone.updated_at,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching delivery zones:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch delivery zones' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/admin/delivery-zones - Create new delivery zone
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin'], '/login');

    const body = await request.json();
    const validatedData = deliveryZoneSchema.parse(body);

    // Check for duplicate zone name
    const existing = await prisma.delivery_zones.findFirst({
      where: {
        tenant_id: tenant.id,
        name: validatedData.name,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A zone with this name already exists' },
        { status: 400 }
      );
    }

    const zone = await prisma.delivery_zones.create({
      data: {
        tenant_id: tenant.id,
        name: validatedData.name,
        price: validatedData.price,
        locations: validatedData.locations,
        is_active: validatedData.is_active,
        sort_order: validatedData.sort_order,
      },
    });

    return NextResponse.json({
      success: true,
      zone: {
        id: zone.id,
        name: zone.name,
        price: Number(zone.price),
        locations: zone.locations,
        is_active: zone.is_active,
        sort_order: zone.sort_order,
        created_at: zone.created_at,
        updated_at: zone.updated_at,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating delivery zone:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create delivery zone' },
      { status: error.status || 500 }
    );
  }
}
