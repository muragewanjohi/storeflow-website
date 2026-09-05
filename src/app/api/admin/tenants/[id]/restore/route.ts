import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { addTenantDomain } from '@/lib/vercel-domains';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/tenants/[id]/restore
 * Restore a soft-deleted tenant (landlord only).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const { id } = await params;
    const tenant = await prisma.tenants.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        subdomain: true,
        custom_domain: true,
        data: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
    }

    if (tenant.status !== 'deleted') {
      return NextResponse.json(
        { message: 'Only deleted tenants can be restored' },
        { status: 400 },
      );
    }

    const existingData =
      tenant.data && typeof tenant.data === 'object' && !Array.isArray(tenant.data)
        ? (tenant.data as Record<string, unknown>)
        : {};
    const existingDeletionMeta =
      existingData.account_deletion &&
      typeof existingData.account_deletion === 'object' &&
      !Array.isArray(existingData.account_deletion)
        ? (existingData.account_deletion as Record<string, unknown>)
        : {};

    const restoredTenant = await prisma.tenants.update({
      where: { id: tenant.id },
      data: {
        status: 'active',
        deleted_at: null,
        data: {
          ...existingData,
          account_deletion: {
            ...existingDeletionMeta,
            restored_at: new Date().toISOString(),
            restored_by_user_id: user.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
        subdomain: true,
        custom_domain: true,
      },
    });

    // Re-add domains on a best-effort basis.
    const projectId = process.env.VERCEL_PROJECT_ID;
    if (projectId) {
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
      const subdomainUrl = `${tenant.subdomain}.${baseDomain}`;

      addTenantDomain(subdomainUrl, projectId).catch((error) => {
        console.error(`Failed to re-add subdomain ${subdomainUrl} to Vercel:`, error);
      });

      if (tenant.custom_domain) {
        addTenantDomain(tenant.custom_domain, projectId).catch((error) => {
          console.error(`Failed to re-add custom domain ${tenant.custom_domain} to Vercel:`, error);
        });
      }
    }

    return NextResponse.json(
      {
        message: 'Tenant restored successfully',
        tenant: restoredTenant,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error restoring tenant:', error);

    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { message: 'Access denied. Landlord role required.' },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(
      {
        message:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Internal server error'
            : 'Failed to restore tenant',
      },
      { status: 500 },
    );
  }
}

