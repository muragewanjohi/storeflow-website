/**
 * Tenant Detail API Route
 * 
 * Handles GET (get tenant), PUT (update tenant), and DELETE (delete tenant) requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/admin/tenants/[id]
 * Get tenant details (landlord only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const tenant = await prisma.tenants.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        subdomain: true,
        custom_domain: true,
        status: true,
        created_at: true,
        expire_date: true,
        start_date: true,
        user_id: true,
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
 * DELETE /api/admin/tenants/[id]
 * Delete tenant (soft delete - set status to 'deleted') (landlord only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const tenant = await prisma.tenants.findUnique({
      where: { id: params.id },
      select: { id: true, user_id: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { message: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Soft delete: set status to 'deleted'
    await prisma.tenants.update({
      where: { id: params.id },
      data: {
        status: 'deleted',
      },
    });

    // Optionally, disable the tenant admin user in Supabase Auth
    if (tenant.user_id) {
      const adminClient = createAdminClient();
      await adminClient.auth.admin.updateUserById(tenant.user_id, {
        user_metadata: {
          ...(await adminClient.auth.admin.getUserById(tenant.user_id)).data.user?.user_metadata,
          tenant_status: 'deleted',
        },
      });
    }

    return NextResponse.json(
      { message: 'Tenant deleted successfully' },
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

