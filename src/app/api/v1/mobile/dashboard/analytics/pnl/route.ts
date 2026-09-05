import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { getPnlSummary } from '@/lib/finance/pnl';

const pnlQuerySchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;

  try {
    const { searchParams } = new URL(request.url);
    const query = pnlQuerySchema.parse({
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
    });

    const endDate = query.end_date ? new Date(query.end_date) : new Date();
    const startDate = query.start_date
      ? new Date(query.start_date)
      : new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    const summary = await getPnlSummary(tenantId, startDate, endDate);

    return NextResponse.json(
      mobileSuccess({
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        ...summary,
      }),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid query parameters',
          error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        ),
        { status: 400 },
      );
    }
    console.error('[Mobile Dashboard P&L]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch P&L'), { status: 500 });
  }
}
