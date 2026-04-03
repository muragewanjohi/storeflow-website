import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError } from '@/lib/api/mobile-response';
import type { AuthUser } from '@/lib/auth/types';
import type { Tenant } from '@/lib/tenant-context';
import { canEditData } from '@/lib/tenant-context/access-control';

type TenantRow = NonNullable<
  Awaited<
    ReturnType<
      typeof prisma.tenants.findFirst<{
        where: { id: string; deleted_at: null };
      }>
    >
  >
>;

export function prismaTenantRowToTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    subdomain: row.subdomain,
    custom_domain: row.custom_domain,
    name: row.name,
    contact_email: row.contact_email,
    status: row.status ?? 'active',
    plan_id: row.plan_id,
    expire_date: row.expire_date,
    start_date: row.start_date,
    user_id: row.user_id,
    theme_slug: row.theme_slug,
    created_at: row.created_at ?? new Date(),
    updated_at: row.updated_at ?? new Date(),
    country: row.country,
    data: row.data as Record<string, unknown> | null,
  };
}

export type MobileTenantStaffContext = {
  user: AuthUser;
  tenantId: string;
  tenant: Tenant;
};

/**
 * Resolve bearer user + tenant row for dashboard mobile routes (admin + staff).
 */
export async function requireMobileTenantStaff(
  request: NextRequest,
): Promise<{ ok: true; ctx: MobileTenantStaffContext } | { ok: false; response: NextResponse }> {
  try {
    const user = await requireMobileAuth(request);
    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return {
        ok: false,
        response: NextResponse.json(
          mobileError('FORBIDDEN', 'Only tenant users can access this resource'),
          { status: 403 },
        ),
      };
    }
    if (!user.tenant_id) {
      return {
        ok: false,
        response: NextResponse.json(
          mobileError('FORBIDDEN', 'Tenant context missing for this user'),
          { status: 403 },
        ),
      };
    }
    const row = await prisma.tenants.findFirst({
      where: { id: user.tenant_id, deleted_at: null },
    });
    if (!row) {
      return {
        ok: false,
        response: NextResponse.json(mobileError('NOT_FOUND', 'Tenant not found'), { status: 404 }),
      };
    }
    return {
      ok: true,
      ctx: { user, tenantId: user.tenant_id, tenant: prismaTenantRowToTenant(row) },
    };
  } catch (e) {
    if (e instanceof Error && e.message.includes('Unauthorized mobile request')) {
      return {
        ok: false,
        response: NextResponse.json(
          mobileError('UNAUTHORIZED', 'Missing or invalid bearer token'),
          { status: 401 },
        ),
      };
    }
    throw e;
  }
}

export function mobileTenantMustAllowWrites(tenant: Tenant): NextResponse | null {
  if (!canEditData(tenant)) {
    return NextResponse.json(
      mobileError(
        'FORBIDDEN',
        'Write operations are disabled. Your subscription has expired. Please renew to restore full access.',
      ),
      { status: 403 },
    );
  }
  return null;
}
