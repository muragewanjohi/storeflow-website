/**
 * Tenant Settings Page
 * 
 * General settings for the tenant including contact email
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import TenantSettingsClient from './tenant-settings-client';

export default async function TenantSettingsPage() {
  // Require authentication and tenant_admin role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  return <TenantSettingsClient tenant={tenant} />;
}

