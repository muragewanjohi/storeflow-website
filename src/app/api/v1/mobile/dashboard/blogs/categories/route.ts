import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import {
  BlogCategoryAdminError,
  createBlogCategoryForTenant,
  listBlogCategoriesForTenant,
} from '@/lib/blogs/admin-categories';
import { createBlogCategorySchema } from '@/lib/content/validation';

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const items = await listBlogCategoriesForTenant(gate.ctx.tenantId);
    return NextResponse.json(mobileSuccess({ items }), { status: 200 });
  } catch (error) {
    console.error('[Mobile blog categories GET]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch blog categories'), {
      status: 500,
    });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  try {
    const body = await request.json();
    const parsed = createBlogCategorySchema.parse({
      name: body.name,
      slug: body.slug,
    });
    const category = await createBlogCategoryForTenant(gate.ctx.tenantId, parsed);
    return NextResponse.json(mobileSuccess({ category }), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid payload',
          error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        ),
        { status: 400 },
      );
    }
    if (error instanceof BlogCategoryAdminError) {
      return NextResponse.json(mobileError('VALIDATION_ERROR', error.message), { status: error.status });
    }
    console.error('[Mobile blog categories POST]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to create blog category'), {
      status: 500,
    });
  }
}
