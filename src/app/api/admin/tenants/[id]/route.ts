/**
 * Tenant Management API Route
 * 
 * Handles GET (get tenant), PUT (update tenant), and DELETE (delete tenant) requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { removeTenantDomain } from '@/lib/vercel-domains';
import { z } from 'zod';

// Validation schema for tenant update
const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  custom_domain: z.string().nullable().optional(),
  status: z.enum(['active', 'suspended', 'expired']).optional(),
  plan_id: z.string().uuid().nullable().optional(),
  expire_date: z.string().nullable().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/tenants/[id]
 * Get tenant details (landlord only)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const { id } = await params;

    const tenant = await prisma.tenants.findUnique({
      where: { id },
      include: {
        price_plans: {
          select: {
            id: true,
            name: true,
            price: true,
            duration_months: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { message: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ tenant }, { status: 200 });
  } catch (error) {
    console.error('Error fetching tenant:', error);

    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { message: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { message: 'Access denied. Landlord role required.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        message: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to fetch tenant'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/tenants/[id]
 * Update tenant (landlord only)
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = updateTenantSchema.parse(body);

    // Check if tenant exists
    const existingTenant = await prisma.tenants.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      return NextResponse.json(
        { message: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    
    if (validatedData.custom_domain !== undefined) {
      updateData.custom_domain = validatedData.custom_domain;
    }
    
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }
    
    if (validatedData.plan_id !== undefined) {
      updateData.plan_id = validatedData.plan_id;
      
      // If plan is assigned, calculate expire_date
      if (validatedData.plan_id) {
        const plan = await prisma.price_plans.findUnique({
          where: { id: validatedData.plan_id },
        });
        
        if (plan) {
          const expireDate = new Date();
          expireDate.setMonth(expireDate.getMonth() + plan.duration_months);
          updateData.expire_date = expireDate;
        }
      } else {
        // If no plan, clear expire_date
        updateData.expire_date = null;
      }
    }
    
    if (validatedData.expire_date !== undefined) {
      updateData.expire_date = validatedData.expire_date 
        ? new Date(validatedData.expire_date) 
        : null;
    }

    // Update tenant
    const updatedTenant = await prisma.tenants.update({
      where: { id },
      data: updateData,
      include: {
        price_plans: {
          select: {
            id: true,
            name: true,
            price: true,
            duration_months: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Tenant updated successfully',
        tenant: updatedTenant,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating tenant:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request data', errors: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { message: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { message: 'Access denied. Landlord role required.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        message: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to update tenant'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tenants/[id]
 * Soft delete tenant (landlord only)
 * - Sets status to 'deleted'
 * - Removes subdomain from Vercel
 * - Keeps data for potential restoration
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const { id } = await params;

    // Check if tenant exists
    const tenant = await prisma.tenants.findUnique({
      where: { id },
    });

    if (!tenant) {
      return NextResponse.json(
        { message: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Remove subdomain from Vercel (non-blocking)
    const projectId = process.env.VERCEL_PROJECT_ID;
    if (projectId && tenant.subdomain) {
      const subdomainUrl = `${tenant.subdomain}.dukanest.com`;
      removeTenantDomain(subdomainUrl, projectId).catch((error) => {
        // Log error but don't fail tenant deletion
        console.error(`Failed to remove subdomain ${subdomainUrl} from Vercel:`, error);
      });
    }

    // Soft delete: Update status to 'deleted' instead of actually deleting
    // This allows for potential restoration later
    const deletedTenant = await prisma.tenants.update({
      where: { id },
      data: {
        status: 'deleted',
        // Optionally, you could add a deleted_at timestamp field
        // deleted_at: new Date(),
      },
    });

    return NextResponse.json(
      {
        message: 'Tenant deleted successfully',
        tenant: {
          id: deletedTenant.id,
          name: deletedTenant.name,
          status: deletedTenant.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting tenant:', error);

    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { message: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { message: 'Access denied. Landlord role required.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        message: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to delete tenant'
      },
      { status: 500 }
    );
  }
}
