/**
 * Delivery Zones Management Page
 * 
 * Manage delivery zones for the tenant
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import DeliveryZonesClient from './delivery-zones-client';

export const dynamic = 'force-dynamic';

export default async function DeliveryZonesPage() {
  // Require authentication and tenant_admin role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  return <DeliveryZonesClient />;
}
