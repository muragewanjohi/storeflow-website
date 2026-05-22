import { NextRequest, NextResponse } from 'next/server';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { buildCustomersExportCsv } from '@/lib/customers/admin-operations';

/**
 * GET /api/v1/mobile/dashboard/customers/export
 * Query: search, email, format=json|csv (default json envelope; csv returns raw file)
 */
export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') ?? 'json';
    const { csvContent, filename, rowCount } = await buildCustomersExportCsv(gate.ctx.tenantId, {
      search: searchParams.get('search') ?? undefined,
      email: searchParams.get('email') ?? undefined,
    });

    if (format === 'csv') {
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(
      mobileSuccess({
        csv: csvContent,
        filename,
        rowCount,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error('[Mobile customers export]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to export customers'), {
      status: 500,
    });
  }
}
