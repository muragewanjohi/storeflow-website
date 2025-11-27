/**
 * Themes Management Page
 * 
 * Lists all available themes and allows installation/activation
 */

import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import ThemesListClient from './themes-list-client';

export const dynamic = 'force-dynamic';

export default async function ThemesPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    return null;
  }

  return <ThemesListClient />;
}

