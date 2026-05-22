import { NextRequest, NextResponse } from 'next/server';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { FormAdminError, listFormSubmissions } from '@/lib/forms/admin-forms';

function getParam(searchParams: URLSearchParams, key: string): string | undefined {
  const value = searchParams.get(key);
  return value === null ? undefined : value;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { id } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(getParam(searchParams, 'page') || '1', 10);
    const limit = parseInt(getParam(searchParams, 'limit') || '20', 10);

    const result = await listFormSubmissions(gate.ctx.tenantId, id, { page, limit });

    return NextResponse.json(
      mobileSuccess(
        {
          submissions: result.submissions.map((submission) => ({
            id: submission.id,
            data: submission.data,
            ipAddress: submission.ip_address,
            createdAt: submission.created_at?.toISOString() ?? null,
          })),
        },
        result.pagination,
      ),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof FormAdminError) {
      return NextResponse.json(mobileError('NOT_FOUND', error.message), { status: error.status });
    }
    console.error('[Mobile form submissions GET]', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch submissions'),
      { status: 500 },
    );
  }
}
