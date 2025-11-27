/**
 * New Form Page
 * 
 * Form builder for creating a new form
 */

import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import FormBuilderClient from '../form-builder-client';

export const dynamic = 'force-dynamic';

export default async function NewFormPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    return null;
  }

  return <FormBuilderClient />;
}

