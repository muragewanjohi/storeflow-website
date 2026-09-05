/**
 * Mobile mirror of GET/PATCH/DELETE /api/dashboard/bookings/[id] — real
 * scheduling/booking (S2, docs/SERVICES_PLAN.md).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { updateBookingSchema } from '@/lib/bookings/validation';
import { formatBookingForResponse } from '@/lib/bookings/format';

async function requireOwnedBooking(id: string, tenantId: string) {
  return prisma.service_bookings.findFirst({
    where: { id, tenant_id: tenantId },
    include: { products: { select: { name: true } } },
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;

  try {
    const { id } = await params;
    const booking = await requireOwnedBooking(id, tenantId);
    if (!booking) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Booking not found'), { status: 404 });
    }
    return NextResponse.json(mobileSuccess({ booking: formatBookingForResponse(booking) }));
  } catch (error: any) {
    console.error('[Mobile Booking Detail] GET error:', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch booking'), { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;

  try {
    const { id } = await params;
    const existing = await requireOwnedBooking(id, tenantId);
    if (!existing) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Booking not found'), { status: 404 });
    }

    const body = await request.json();
    const input = updateBookingSchema.parse(body);

    const updated = await prisma.service_bookings.update({
      where: { id },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.staff_label !== undefined ? { staff_label: input.staff_label } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        updated_at: new Date(),
      },
      include: { products: { select: { name: true } } },
    });

    return NextResponse.json(mobileSuccess({ booking: formatBookingForResponse(updated) }));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(mobileError('VALIDATION_ERROR', 'Invalid request'), { status: 400 });
    }
    console.error('[Mobile Booking Detail] PATCH error:', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update booking'), { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;

  try {
    const { id } = await params;
    const existing = await requireOwnedBooking(id, tenantId);
    if (!existing) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Booking not found'), { status: 404 });
    }

    const updated = await prisma.service_bookings.update({
      where: { id },
      data: { status: 'cancelled', updated_at: new Date() },
      include: { products: { select: { name: true } } },
    });

    return NextResponse.json(mobileSuccess({ booking: formatBookingForResponse(updated) }));
  } catch (error: any) {
    console.error('[Mobile Booking Detail] DELETE error:', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to cancel booking'), { status: 500 });
  }
}
