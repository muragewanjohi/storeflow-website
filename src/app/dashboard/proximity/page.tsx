import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import ProximityHubClient from './proximity-hub-client';

export const dynamic = 'force-dynamic';

export default async function ProximityHubPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
  await requireTenant();
  return <ProximityHubClient />;
}
