/**
 * Mobile mirror of GET /api/bookings/availability — real scheduling/
 * booking (S2, docs/SERVICES_PLAN.md). Bearer-authenticated (the merchant
 * companion app checks availability when manually adding a booking from
 * the dashboard, not as an anonymous storefront customer), so this is a
 * separate route from the public one rather than reusing it unauthenticated.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { getAvailableSlotsForProduct } from '@/lib/bookings/availability';

const querySchema = z.object({
  productId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;

  try {
    const { searchParams } = new URL(request.url);
    const input = querySchema.parse({
      productId: searchParams.get('productId'),
      date: searchParams.get('date'),
    });

    const slots = await getAvailableSlotsForProduct({
      tenantId,
      productId: input.productId,
      date: input.date,
      now: new Date(),
    });

    if (slots === null) {
      return NextResponse.json(mobileError('BAD_REQUEST', 'This product is not bookable'), { status: 400 });
    }

    return NextResponse.json(mobileSuccess({ date: input.date, slots }));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(mobileError('VALIDATION_ERROR', 'Invalid request'), { status: 400 });
    }
    console.error('[Mobile Bookings Availability] Error:', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to load availability'), { status: 500 });
  }
}
