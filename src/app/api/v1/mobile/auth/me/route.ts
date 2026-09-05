import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';

/**
 * GET /api/v1/mobile/auth/me
 * Restore session context after app cold start (user + tenant summary for dashboard roles).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    const isTenantRole = user.role === 'tenant_admin' || user.role === 'tenant_staff';

    if (!isTenantRole) {
      return NextResponse.json(
        mobileSuccess({
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenant_id ?? null,
          },
          tenant: null,
        }),
        { status: 200 },
      );
    }

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const tenant = await prisma.tenants.findFirst({
      where: { id: user.tenant_id, deleted_at: null },
      select: {
        id: true,
        name: true,
        subdomain: true,
        status: true,
        custom_domain: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Tenant not found'), { status: 404 });
    }

    return NextResponse.json(
      mobileSuccess({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: tenant.id,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          status: tenant.status,
          domain: tenant.custom_domain ?? `${tenant.subdomain}.dukanest.com`,
        },
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized mobile request')) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Missing or invalid bearer token'),
        { status: 401 },
      );
    }

    console.error('[Mobile Auth Me]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to load session'), { status: 500 });
  }
}
