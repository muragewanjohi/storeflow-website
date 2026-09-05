import { NextRequest, NextResponse } from 'next/server';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { TenantThemeAdminError, getThemeById } from '@/lib/themes/tenant-theme-admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { id } = await params;

  try {
    const theme = await getThemeById(id);
    return NextResponse.json(mobileSuccess({ theme }), { status: 200 });
  } catch (error) {
    if (error instanceof TenantThemeAdminError) {
      return NextResponse.json(mobileError('NOT_FOUND', error.message), { status: error.status });
    }
    console.error('[Mobile theme GET]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch theme'), { status: 500 });
  }
}
