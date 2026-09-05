/**
 * Mobile mirror of GET/POST /api/dashboard/bookings — real scheduling/
 * booking (S2, docs/SERVICES_PLAN.md). Bearer-auth (requireMobileTenantStaff),
 * mobileSuccess/mobileError envelope, same pattern as every other mobile
 * mirror this session (e.g. /api/v1/mobile/assistant/chat).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { bookingQuerySchema, createBookingSchema } from '@/lib/bookings/validation';
import { createBookingWithCapacityCheck, BookingUnavailableError } from '@/lib/bookings/availability';
import { formatBookingForResponse } from '@/lib/bookings/format';

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;

  try {
    const { searchParams } = new URL(request.url);
    const query = bookingQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    const where: any = { tenant_id: tenantId };
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

    return NextResponse.json(
      mobileSuccess({
        items: bookings.map(formatBookingForResponse),
        pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      }),
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(mobileError('VALIDATION_ERROR', 'Invalid query parameters'), { status: 400 });
    }
    console.error('[Mobile Bookings] GET error:', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch bookings'), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;

  try {
    const body = await request.json();
    const input = createBookingSchema.parse(body);

    const booking = await createBookingWithCapacityCheck({
      tenantId,
      productId: input.product_id,
      date: input.date,
      startTime: input.start_time,
      customerName: input.customer_name,
      customerPhone: input.customer_phone,
      customerEmail: input.customer_email,
      status: 'confirmed',
    });

    if (input.notes) {
      await prisma.service_bookings.update({ where: { id: booking.id }, data: { notes: input.notes } });
    }

    const withProduct = await prisma.service_bookings.findUnique({
      where: { id: booking.id },
      include: { products: { select: { name: true } } },
    });

    return NextResponse.json(mobileSuccess({ booking: formatBookingForResponse(withProduct!) }), { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(mobileError('VALIDATION_ERROR', 'Invalid request'), { status: 400 });
    }
    if (error instanceof BookingUnavailableError) {
      return NextResponse.json(mobileError('CONFLICT', error.message), { status: 409 });
    }
    console.error('[Mobile Bookings] POST error:', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to create booking'), { status: 500 });
  }
}
