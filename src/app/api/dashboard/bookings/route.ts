/**
 * Bookings Management API Route — real scheduling/booking (S2,
 * docs/SERVICES_PLAN.md). Mirrors src/app/api/dashboard/sales/route.ts's
 * exact auth/query/pagination shape.
 *
 * GET: list bookings (date range/status filterable)
 * POST: manually create a booking (e.g. a phone-booked customer) —
 *   reuses the exact same capacity-checked write path checkout uses.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { bookingQuerySchema, createBookingSchema } from '@/lib/bookings/validation';
import { createBookingWithCapacityCheck, BookingUnavailableError } from '@/lib/bookings/availability';
import { formatBookingForResponse } from '@/lib/bookings/format';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

    if (user.tenant_id !== tenant.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = bookingQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    const where: any = { tenant_id: tenant.id };
    if (query.status) where.status = query.status;
    if (query.date) {
      where.booking_date = new Date(`${query.date}T00:00:00.000Z`);
    } else if (query.date_from || query.date_to) {
      where.booking_date = {};
      if (query.date_from) where.booking_date.gte = new Date(`${query.date_from}T00:00:00.000Z`);
      if (query.date_to) where.booking_date.lte = new Date(`${query.date_to}T00:00:00.000Z`);
    }

    const skip = (query.page - 1) * query.limit;
    const [bookings, total] = await Promise.all([
      prisma.service_bookings.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ booking_date: 'asc' }, { start_time: 'asc' }],
        include: { products: { select: { name: true } } },
      }),
      prisma.service_bookings.count({ where }),
    ]);

    return NextResponse.json({
      bookings: bookings.map(formatBookingForResponse),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', issues: error.issues }, { status: 400 });
    }
    console.error('[Bookings] GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

    if (user.tenant_id !== tenant.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const input = createBookingSchema.parse(body);

    const booking = await createBookingWithCapacityCheck({
      tenantId: tenant.id,
      productId: input.product_id,
      date: input.date,
      startTime: input.start_time,
      customerName: input.customer_name,
      customerPhone: input.customer_phone,
      customerEmail: input.customer_email,
      status: 'confirmed', // a manually dashboard-created booking is already confirmed by the merchant, not awaiting a payment webhook
    });

    if (input.notes) {
      await prisma.service_bookings.update({ where: { id: booking.id }, data: { notes: input.notes } });
    }

    const withProduct = await prisma.service_bookings.findUnique({
      where: { id: booking.id },
      include: { products: { select: { name: true } } },
    });

    return NextResponse.json({ success: true, booking: formatBookingForResponse(withProduct!) }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', issues: error.issues }, { status: 400 });
    }
    if (error instanceof BookingUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('[Bookings] POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create booking' }, { status: 500 });
  }
}
