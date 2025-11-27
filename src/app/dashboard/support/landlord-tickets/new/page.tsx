/**
 * Create Landlord Support Ticket Page
 * 
 * Allows tenant admin to create a support ticket for the landlord
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import CreateLandlordTicketClient from './create-landlord-ticket-client';

export const dynamic = 'force-dynamic';

export default async function CreateLandlordTicketPage() {
  // Require authentication and tenant_admin or tenant_staff role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  return <CreateLandlordTicketClient tenant={tenant} />;
}

