/**
 * Forms Management Page
 * 
 * Lists all form builders for the tenant
 */

import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import FormsListClient from './forms-list-client';

export const dynamic = 'force-dynamic';

export default async function FormsPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    return null;
  }

  return <FormsListClient />;
}

