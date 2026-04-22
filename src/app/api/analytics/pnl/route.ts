import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { getPnlSummary } from '@/lib/finance/pnl';

const pnlQuerySchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);
    const query = pnlQuerySchema.parse({
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
    });

    const endDate = query.end_date ? new Date(query.end_date) : new Date();
    const startDate = query.start_date
      ? new Date(query.start_date)
      : new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    const summary = await getPnlSummary(tenant.id, startDate, endDate);

    return NextResponse.json({
      success: true,
      data: {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        ...summary,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { message: 'Validation error', details: error.issues } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch P&L summary' } },
      { status: error.status || 500 },
    );
  }
}
