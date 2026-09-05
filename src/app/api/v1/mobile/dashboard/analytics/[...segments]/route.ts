import { NextRequest, NextResponse } from 'next/server';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import { ANALYTICS_HANDLERS, getAnalyticsExport } from '@/lib/analytics/dashboard-handlers';
import {
  createScheduledReport,
  deleteScheduledReport,
  listScheduledReports,
} from '@/lib/analytics/scheduled-reports';

type RouteContext = {
  params: Promise<{ segments?: string[] }>;
};

function resolvePathKey(segments: string[] | undefined): string {
  return (segments ?? []).join('/');
}

async function handleExport(
  tenantId: string,
  searchParams: URLSearchParams,
): Promise<NextResponse> {
  const result = (await getAnalyticsExport(tenantId, searchParams)) as {
    format: string;
    filename: string;
    content: unknown;
    isCsv: boolean;
  };

  if (result.isCsv) {
    return new NextResponse(String(result.content), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  }

  const raw = searchParams.get('raw') === 'true' || searchParams.get('raw') === '1';
  if (raw) {
    return NextResponse.json(result.content, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  }

  return NextResponse.json(mobileSuccess(result.content), { status: 200 });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const { segments } = await context.params;
  const pathKey = resolvePathKey(segments);
  const { searchParams } = new URL(request.url);

  if (pathKey === 'export') {
    try {
      return await handleExport(gate.ctx.tenantId, searchParams);
    } catch (error) {
      console.error('[Mobile Analytics Export]', error);
      return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to export analytics'), {
        status: 500,
      });
    }
  }

  if (pathKey === 'scheduled-reports') {
    try {
      const reports = await listScheduledReports(gate.ctx.tenant);
      return NextResponse.json(mobileSuccess(reports), { status: 200 });
    } catch (error) {
      console.error('[Mobile Analytics GET scheduled-reports]', error);
      return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch scheduled reports'), {
        status: 500,
      });
    }
  }

  const handler = ANALYTICS_HANDLERS[pathKey];
  if (!handler) {
    return NextResponse.json(mobileError('NOT_FOUND', `Unknown analytics endpoint: ${pathKey}`), {
      status: 404,
    });
  }

  try {
    const data = await handler(gate.ctx.tenantId, searchParams);
    return NextResponse.json(mobileSuccess(data), { status: 200 });
  } catch (error) {
    console.error(`[Mobile Analytics GET ${pathKey}]`, error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch analytics'), {
      status: 500,
    });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const writeBlock = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (writeBlock) return writeBlock;

  const { segments } = await context.params;
  const pathKey = resolvePathKey(segments);

  if (pathKey !== 'scheduled-reports') {
    return NextResponse.json(mobileError('NOT_FOUND', `Unknown analytics endpoint: ${pathKey}`), {
      status: 404,
    });
  }

  try {
    const body = await request.json();
    const report = await createScheduledReport(gate.ctx.tenant, body);
    return NextResponse.json(mobileSuccess(report), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Missing required fields') {
      return NextResponse.json(mobileError('VALIDATION_ERROR', error.message), { status: 400 });
    }
    console.error('[Mobile Analytics POST scheduled-reports]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to create scheduled report'), {
      status: 500,
    });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const writeBlock = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (writeBlock) return writeBlock;

  const { segments } = await context.params;
  const pathKey = resolvePathKey(segments);

  if (pathKey !== 'scheduled-reports') {
    return NextResponse.json(mobileError('NOT_FOUND', `Unknown analytics endpoint: ${pathKey}`), {
      status: 404,
    });
  }

  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get('id');
  if (!reportId) {
    return NextResponse.json(mobileError('VALIDATION_ERROR', 'Report ID is required'), {
      status: 400,
    });
  }

  try {
    await deleteScheduledReport(gate.ctx.tenantId, reportId);
    return NextResponse.json(mobileSuccess({ deleted: true }), { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Tenant not found') {
      return NextResponse.json(mobileError('NOT_FOUND', error.message), { status: 404 });
    }
    console.error('[Mobile Analytics DELETE scheduled-reports]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete scheduled report'), {
      status: 500,
    });
  }
}
