/**
 * Booking Hours Settings — real scheduling/booking (S2, docs/SERVICES_PLAN.md).
 */
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { getStaticOption } from '@/lib/settings/static-options';
import { getBookingSettings } from '@/lib/bookings/availability';
import BookingHoursClient from './booking-hours-client';

export default async function BookingHoursPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
  const tenant = await requireTenant();

  const raw = await getStaticOption(tenant.id, 'booking_hours');
  const settings = getBookingSettings(raw);

  return <BookingHoursClient initialSettings={settings} />;
}
