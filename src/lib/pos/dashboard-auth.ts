/**
 * Shared cookie-session auth gate for the web dashboard POS API routes
 * (`/api/dashboard/pos/*`). Mirrors the pattern used by
 * `/api/dashboard/sales`: authenticated tenant staff/admin, scoped to their
 * own tenant.
 */

import { NextResponse } from 'next/server';
import { requireAuth, hasAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import type { AuthUser } from '@/lib/auth/types';
import type { Tenant } from '@/lib/tenant-context';

export type PosDashboardGate =
  | { ok: true; user: AuthUser; tenant: Tenant }
  | { ok: false; response: NextResponse };

export async function requirePosDashboardStaff(): Promise<PosDashboardGate> {
  let user: AuthUser;
  try {
    user = await requireAuth();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!hasAnyRole(user, ['tenant_admin', 'tenant_staff'])) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  const tenant = await requireTenant();
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true, user, tenant };
}
