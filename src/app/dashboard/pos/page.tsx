/**
 * Point of Sale (web dashboard)
 *
 * Counter-sale flow for tenant staff/admin. The catalogue + settings snapshot
 * is loaded server-side (shared @/lib/pos/load-bootstrap core); the sale is
 * recorded via POST /api/dashboard/pos/sales.
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { loadPosBootstrap } from '@/lib/pos/load-bootstrap';
import PosClient from './pos-client';

export const dynamic = 'force-dynamic';

export default async function PosPage() {
  const user = await requireAuthOrRedirect('/dashboard/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/dashboard/login');

  const tenant = await requireTenant();
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/dashboard/login');
  }

  const bootstrap = await loadPosBootstrap(tenant);

  return <PosClient initialBootstrap={bootstrap} />;
}
