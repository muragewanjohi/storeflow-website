/**
 * Roles & Permissions Management Page
 * 
 * Displays available roles and their permissions
 * Allows tenants to understand what each role can do
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import RolesPermissionsClient from './roles-permissions-client';

export const dynamic = 'force-dynamic';

export default async function RolesPermissionsPage() {
  // Require authentication and tenant_admin or landlord role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'landlord'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  return <RolesPermissionsClient />;
}
