/**
 * API Route: Update Tenant Contact Email
 * 
 * PATCH /api/dashboard/settings/contact-email
 * 
 * Allows tenant admin to update their contact email
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const updateContactEmailSchema = z.object({
  contactEmail: z.string().email('Invalid email address'),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin']);

    const tenant = await requireTenant();

    // Verify user belongs to tenant (unless landlord)
    if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateContactEmailSchema.parse(body);

    // Update tenant contact email
    const updatedTenant = await prisma.tenants.update({
      where: { id: tenant.id },
      data: {
        contact_email: validatedData.contactEmail,
      },
    });

    return NextResponse.json({
      success: true,
      tenant: {
        id: updatedTenant.id,
        contact_email: updatedTenant.contact_email,
      },
    });
  } catch (error: any) {
    console.error('Error updating contact email:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          message: error.issues[0].message 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to update contact email',
        message: error.message || 'An error occurred while updating the contact email'
      },
      { status: 500 }
    );
  }
}

