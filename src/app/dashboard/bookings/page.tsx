/**
 * Bookings Management Page — real scheduling/booking (S2,
 * docs/SERVICES_PLAN.md).
 */
import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import BookingsClient from './bookings-client';

export const dynamic = 'force-dynamic';

export default async function BookingsPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  return <BookingsClient />;
}
