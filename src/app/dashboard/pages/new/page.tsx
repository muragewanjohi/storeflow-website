/**
 * Create Page Page
 * 
 * Form for creating a new page
 */

import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import PageFormClient from '../page-form-client';

export default async function NewPagePage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    return null;
  }

  // Get base URL for SEO preview
  const baseUrl = tenant.custom_domain
    ? `https://${tenant.custom_domain}`
    : tenant.subdomain
    ? `https://${tenant.subdomain}.dukanest.com`
    : 'https://example.com';

  return <PageFormClient baseUrl={baseUrl} />;
}

