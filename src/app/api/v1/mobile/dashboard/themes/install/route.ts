import { NextRequest, NextResponse } from 'next/server';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import {
  ThemeInstallError,
  installThemeForTenant,
  trackFailedThemeInstallation,
} from '@/lib/themes/install-theme';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  const startTime = Date.now();
  const body = await request.json();

  try {
    const result = await installThemeForTenant(gate.ctx.tenant, body, request);

    return NextResponse.json(
      mobileSuccess({
        tenant_theme: result.tenant_theme,
        homepage_created: result.homepage_created,
        additional_pages_created: result.additional_pages_created,
        defaults_applied: result.defaults_applied,
        demo_content_created: result.demo_content_created,
        demo_categories_created: result.demo_categories_created,
        demo_products_created: result.demo_products_created,
        demo_attributes_created: result.demo_attributes_created,
        demo_pages_created: result.demo_pages_created,
        demo_sales_created: result.demo_sales_created,
        demo_blogs_created: result.demo_blogs_created,
        demo_blog_categories_created: result.demo_blog_categories_created,
        demo_forms_created: result.demo_forms_created,
      }),
      { status: result.status },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to install theme';
    const installationDuration = Date.now() - startTime;

    await trackFailedThemeInstallation(
      request,
      gate.ctx.tenantId,
      body,
      errorMessage,
      installationDuration,
    );

    if (error instanceof ThemeInstallError) {
      const code =
        error.status === 404
          ? 'NOT_FOUND'
          : error.status === 400
            ? 'BAD_REQUEST'
            : error.status === 403
              ? 'FORBIDDEN'
              : 'INTERNAL_ERROR';
      return NextResponse.json(mobileError(code, error.message), { status: error.status });
    }

    console.error('[Mobile themes/install POST]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', errorMessage), { status: 500 });
  }
}
