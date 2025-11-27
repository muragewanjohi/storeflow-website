/**
 * Theme Customization Page
 * 
 * Allows tenants to customize their active theme (colors, fonts, layouts)
 */

import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import ThemeCustomizeClient from './theme-customize-client';

export const dynamic = 'force-dynamic';

export default async function ThemeCustomizePage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    return null;
  }

  return <ThemeCustomizeClient />;
}

