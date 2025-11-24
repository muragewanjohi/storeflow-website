/**
 * Customer Address Management API Routes
 * 
 * GET: List customer addresses
 * POST: Create customer address
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { customerAddressSchema } from '@/lib/customers/validation';

/**
 * GET /api/customers/[id]/addresses - List customer addresses
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
    const { id } = await params;

    // Verify customer exists and belongs to tenant
    const customer = await prisma.customers.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get customer addresses
    const addresses = await prisma.user_delivery_addresses.findMany({
      where: {
        user_id: id,
        tenant_id: tenant.id,
      },
      orderBy: [
        { is_default: 'desc' },
        { created_at: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      addresses: addresses.map((address) => ({
        id: address.id,
        name: address.name,
        email: address.email,
        phone: address.phone,
        address: address.address,
        city: address.city,
        state_id: address.state_id,
        country_id: address.country_id,
        postal_code: address.postal_code,
        is_default: address.is_default,
        created_at: address.created_at,
        updated_at: address.updated_at,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching customer addresses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch addresses' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/customers/[id]/addresses - Create customer address
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
    const { id } = await params;
    const body = await request.json();

    const validatedData = customerAddressSchema.parse(body);

    // Verify customer exists and belongs to tenant
    const customer = await prisma.customers.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // If this is set as default, unset other default addresses
    if (validatedData.is_default) {
      await prisma.user_delivery_addresses.updateMany({
        where: {
          user_id: id,
          tenant_id: tenant.id,
          is_default: true,
        },
        data: {
          is_default: false,
        },
      });
    }

    // Create address
    const address = await prisma.user_delivery_addresses.create({
      data: {
        tenant_id: tenant.id,
        user_id: id,
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
        city: validatedData.city,
        state_id: validatedData.state_id,
        country_id: validatedData.country_id,
        postal_code: validatedData.postal_code,
        is_default: validatedData.is_default,
      },
    });

    return NextResponse.json(
      {
        success: true,
        address: {
          id: address.id,
          name: address.name,
          email: address.email,
          phone: address.phone,
          address: address.address,
          city: address.city,
          state_id: address.state_id,
          country_id: address.country_id,
          postal_code: address.postal_code,
          is_default: address.is_default,
          created_at: address.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating customer address:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create address' },
      { status: error.status || 500 }
    );
  }
}

