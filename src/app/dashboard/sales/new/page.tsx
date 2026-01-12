/**
 * New Sale Page
 * 
 * Redirects to create a new sale
 * 
 * Phase 3: Dashboard UI - Sales Implementation
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import SaleFormClient from '../sale-form-client';

export default async function NewSalePage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Get base URL for preview
  const baseUrl = tenant.custom_domain
    ? `https://${tenant.custom_domain}`
    : tenant.subdomain
    ? `https://${tenant.subdomain}.dukanest.com`
    : 'https://example.com';

  return <SaleFormClient baseUrl={baseUrl} />;
}
