/**
 * Customer Address Detail API Routes
 * 
 * PUT: Update customer address
 * DELETE: Delete customer address
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { customerAddressSchema } from '@/lib/customers/validation';

/**
 * PUT /api/customers/[id]/addresses/[addressId] - Update customer address
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
    const { id, addressId } = await params;
    const body = await request.json();

    const validatedData = customerAddressSchema.parse(body);

    // Verify customer and address exist and belong to tenant
    const address = await prisma.user_delivery_addresses.findFirst({
      where: {
        id: addressId,
        user_id: id,
        tenant_id: tenant.id,
      },
    });

    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // If this is set as default, unset other default addresses
    if (validatedData.is_default) {
      await prisma.user_delivery_addresses.updateMany({
        where: {
          user_id: id,
          tenant_id: tenant.id,
          is_default: true,
          id: { not: addressId },
        },
        data: {
          is_default: false,
        },
      });
    }

    // Update address
    const updatedAddress = await prisma.user_delivery_addresses.update({
      where: { id: addressId },
      data: {
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

    return NextResponse.json({
      success: true,
      address: {
        id: updatedAddress.id,
        name: updatedAddress.name,
        email: updatedAddress.email,
        phone: updatedAddress.phone,
        address: updatedAddress.address,
        city: updatedAddress.city,
        state_id: updatedAddress.state_id,
        country_id: updatedAddress.country_id,
        postal_code: updatedAddress.postal_code,
        is_default: updatedAddress.is_default,
        updated_at: updatedAddress.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error updating customer address:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update address' },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/customers/[id]/addresses/[addressId] - Delete customer address
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
    const { id, addressId } = await params;

    // Verify address exists and belongs to customer and tenant
    const address = await prisma.user_delivery_addresses.findFirst({
      where: {
        id: addressId,
        user_id: id,
        tenant_id: tenant.id,
      },
    });

    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // Delete address
    await prisma.user_delivery_addresses.delete({
      where: { id: addressId },
    });

    return NextResponse.json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting customer address:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete address' },
      { status: error.status || 500 }
    );
  }
}

