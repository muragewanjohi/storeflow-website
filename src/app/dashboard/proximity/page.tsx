import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import ProximityHubClient from './proximity-hub-client';

export const dynamic = 'force-dynamic';

function viewerFirstName(user: { email: string; metadata?: { name?: string; full_name?: string } }) {
  const raw = user.metadata?.name || user.metadata?.full_name || '';
  const trimmed = raw.trim();
  if (trimmed) return trimmed.split(/\s+/)[0];
  return user.email.split('@')[0] || 'there';
}

function roleLabel(role: string) {
  if (role === 'tenant_admin') return 'Store admin';
  if (role === 'landlord') return 'Landlord';
  return 'Store manager';
}

export default async function ProximityHubPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
  const tenant = await requireTenant();
  return (
    <ProximityHubClient
      viewerName={viewerFirstName(user)}
      roleLabel={roleLabel(user.role)}
      storeName={tenant.name}
    />
  );
}
