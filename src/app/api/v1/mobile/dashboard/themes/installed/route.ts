import { NextRequest, NextResponse } from 'next/server';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { listInstalledThemes } from '@/lib/themes/tenant-theme-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const installedThemes = await listInstalledThemes(gate.ctx.tenantId);
    return NextResponse.json(mobileSuccess({ installedThemes }), { status: 200 });
  } catch (e) {
    console.error('[Mobile themes/installed GET]', e);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch installed themes'),
      { status: 500 },
    );
  }
}
