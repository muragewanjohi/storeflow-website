/**
 * Public storefront-facing booking availability — real scheduling/booking
 * (S2, docs/SERVICES_PLAN.md). No auth required, same as GET /api/products
 * (tenant resolved from the subdomain by requireTenant(), not a session).
 *
 * GET /api/bookings/availability?productId=...&date=YYYY-MM-DD
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenant } from '@/lib/tenant-context/server';
import { getAvailableSlotsForProduct } from '@/lib/bookings/availability';

const querySchema = z.object({
  productId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
});

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);
    const input = querySchema.parse({
      productId: searchParams.get('productId'),
      date: searchParams.get('date'),
    });

    const slots = await getAvailableSlotsForProduct({
      tenantId: tenant.id,
      productId: input.productId,
      date: input.date,
      now: new Date(),
    });

    if (slots === null) {
      return NextResponse.json({ error: 'This product is not bookable' }, { status: 400 });
    }

    return NextResponse.json({ success: true, date: input.date, slots });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('[Bookings Availability] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to load availability' }, { status: error.status || 500 });
  }
}
