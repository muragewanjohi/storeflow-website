import { requireAnyRoleOrRedirect, requireAuthOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { redirect } from 'next/navigation';
import StarterPackTestClient from './starter-pack-test-client';

export const dynamic = 'force-dynamic';

export default async function StarterPackTestingPage() {
  const user = await requireAuthOrRedirect('/dashboard/login');
  const tenant = await requireTenant();
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/dashboard/login');

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/dashboard/login');
  }

  return <StarterPackTestClient tenantId={tenant.id} />;
}

