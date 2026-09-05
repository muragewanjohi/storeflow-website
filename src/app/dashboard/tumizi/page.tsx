import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { getStaticOptions } from '@/lib/settings/static-options';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';
import TumiziDashboardClient from './tumizi-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function DashboardTumiziPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  const [settings, tumiziConfig] = await Promise.all([
    getStaticOptions(tenant.id, ['payment_tumizi_enabled']),
    getTumiziTenantConfigByTenantId(tenant.id),
  ]);

  const isTumiziEnabled =
    settings.payment_tumizi_enabled === 'true' ||
    (tumiziConfig?.enabled === true && Boolean(tumiziConfig?.merchantExternalId));

  return (
    <TumiziDashboardClient
      tenantName={tenant.name || tenant.subdomain}
      isTumiziEnabled={isTumiziEnabled}
    />
  );
}
