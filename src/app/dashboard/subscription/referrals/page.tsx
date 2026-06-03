import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import ReferralRewardsClient from './referral-rewards-client';

export const dynamic = 'force-dynamic';

export default async function ReferralRewardsPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  if (user.role !== 'tenant_admin') {
    redirect('/dashboard/subscription');
  }

  return <ReferralRewardsClient tenant={tenant} />;
}
