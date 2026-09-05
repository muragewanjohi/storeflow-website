/**
 * Booking detail — real scheduling/booking (S2, docs/SERVICES_PLAN.md).
 *
 * GET: detail
 * PATCH: update status/staff_label/notes
 * DELETE: cancel (soft — sets status: 'cancelled', never a hard delete,
 *   matching this codebase's "cancel" convention elsewhere, e.g. orders)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { updateBookingSchema } from '@/lib/bookings/validation';
import { formatBookingForResponse } from '@/lib/bookings/format';

async function requireOwnedBooking(id: string, tenantId: string) {
  const booking = await prisma.service_bookings.findFirst({
    where: { id, tenant_id: tenantId },
    include: { products: { select: { name: true } } },
  });
  return booking;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
    if (user.tenant_id !== tenant.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const booking = await requireOwnedBooking(id, tenant.id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    return NextResponse.json({ booking: formatBookingForResponse(booking) });
  } catch (error: any) {
    console.error('[Booking Detail] GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch booking' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
    if (user.tenant_id !== tenant.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await requireOwnedBooking(id, tenant.id);
    if (!existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
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

    return NextResponse.json({ success: true, booking: formatBookingForResponse(updated) });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', issues: error.issues }, { status: 400 });
    }
    console.error('[Booking Detail] PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update booking' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
    if (user.tenant_id !== tenant.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await requireOwnedBooking(id, tenant.id);
    if (!existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const updated = await prisma.service_bookings.update({
      where: { id },
      data: { status: 'cancelled', updated_at: new Date() },
      include: { products: { select: { name: true } } },
    });

    return NextResponse.json({ success: true, booking: formatBookingForResponse(updated) });
  } catch (error: any) {
    console.error('[Booking Detail] DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Failed to cancel booking' }, { status: 500 });
  }
}
