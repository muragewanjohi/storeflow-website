import { NextRequest, NextResponse } from 'next/server';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { listMediaForTenant } from '@/lib/media/admin-media';

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || undefined;
    const sync = searchParams.get('sync') === 'true';

    const result = await listMediaForTenant(gate.ctx.tenantId, { limit, offset, search, sync });
    return NextResponse.json(
      mobileSuccess(result, {
        page: Math.floor(offset / limit) + 1,
        limit,
        total: result.total,
        totalPages: limit > 0 ? Math.ceil(result.total / limit) : 0,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error('[Mobile media list]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to list media files'), {
      status: 500,
    });
  }
}
