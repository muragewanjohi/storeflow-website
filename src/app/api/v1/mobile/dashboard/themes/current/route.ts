import { NextRequest, NextResponse } from 'next/server';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import {
  TenantThemeAdminError,
  getCurrentTenantTheme,
  updateTenantThemeCustomizations,
} from '@/lib/themes/tenant-theme-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const result = await getCurrentTenantTheme(gate.ctx.tenantId);
    return NextResponse.json(mobileSuccess(result), { status: 200 });
  } catch (e) {
    console.error('[Mobile themes/current GET]', e);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch current theme'),
      { status: 500 },
    );
  }
}

async function handleUpdate(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  try {
    const tenantTheme = await updateTenantThemeCustomizations(
      gate.ctx.tenantId,
      await request.json(),
    );

    return NextResponse.json(mobileSuccess({ tenant_theme: tenantTheme }), { status: 200 });
  } catch (error) {
    if (error instanceof TenantThemeAdminError) {
      return NextResponse.json(mobileError('NOT_FOUND', error.message), { status: error.status });
    }
    console.error('[Mobile themes/current PUT/PATCH]', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to update theme customizations'),
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  return handleUpdate(request);
}

export async function PATCH(request: NextRequest) {
  return handleUpdate(request);
}
