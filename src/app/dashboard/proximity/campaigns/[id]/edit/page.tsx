import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import CampaignFormClient from '../../new/campaign-form-client';

export const dynamic = 'force-dynamic';

export default async function EditProximityCampaignPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
  await requireTenant();
  const { id } = await params;

  return <CampaignFormClient campaignId={id} />;
}
