/**
 * Pending Delivery Quotes Page (Admin)
 * 
 * Displays orders that need delivery fee quotes
 */

import { requireAuthOrRedirect } from '@/lib/auth/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import PendingQuotesClient from '../pending-quotes-client';

export const dynamic = 'force-dynamic';

export default async function PendingQuotesPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
  
  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    return null;
  }

  return <PendingQuotesClient />;
}
