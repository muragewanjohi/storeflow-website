/**
 * Booking hours settings — real scheduling/booking (S2,
 * docs/SERVICES_PLAN.md). Stored via the real static_options mechanism
 * (option_name: 'booking_hours'), same as the near-identical pickup_hours
 * setting — see @/lib/bookings/availability.ts's getBookingSettings().
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { getStaticOption, setStaticOption } from '@/lib/settings/static-options';
import { getBookingSettings } from '@/lib/bookings/availability';

const dayHoursSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean(),
});

const bookingSettingsSchema = z.object({
  workingHours: z.object({
    mon: dayHoursSchema,
    tue: dayHoursSchema,
    wed: dayHoursSchema,
    thu: dayHoursSchema,
    fri: dayHoursSchema,
    sat: dayHoursSchema,
    sun: dayHoursSchema,
  }),
  slotIntervalMinutes: z.number().int().positive(),
});

export async function GET() {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
    if (user.tenant_id !== tenant.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const raw = await getStaticOption(tenant.id, 'booking_hours');
    return NextResponse.json({ settings: getBookingSettings(raw) });
  } catch (error: any) {
    console.error('[Booking Hours] GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch booking hours' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
    if (user.tenant_id !== tenant.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const settings = bookingSettingsSchema.parse(body);

    await setStaticOption(tenant.id, 'booking_hours', JSON.stringify(settings));

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', issues: error.issues }, { status: 400 });
    }
    console.error('[Booking Hours] PUT error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save booking hours' }, { status: 500 });
  }
}
