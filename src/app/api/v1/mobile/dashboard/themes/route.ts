import { NextRequest, NextResponse } from 'next/server';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';
import { listThemes } from '@/lib/themes/tenant-theme-admin';

export const dynamic = 'force-dynamic';

function getParam(searchParams: URLSearchParams, key: string): string | undefined {
  const value = searchParams.get(key);
  return value === null ? undefined : value;
}

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(request.url);
    const themes = await listThemes({
      status: getParam(searchParams, 'status'),
      isPremium: getParam(searchParams, 'isPremium') ?? getParam(searchParams, 'is_premium'),
    });

    return NextResponse.json(mobileSuccess({ themes }), { status: 200 });
  } catch (e) {
    console.error('[Mobile themes GET]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch themes'), { status: 500 });
  }
}
