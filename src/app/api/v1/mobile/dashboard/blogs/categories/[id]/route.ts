import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import {
  BlogCategoryAdminError,
  deleteBlogCategoryForTenant,
  getBlogCategoryForTenant,
  updateBlogCategoryForTenant,
} from '@/lib/blogs/admin-categories';
import { updateBlogCategorySchema } from '@/lib/content/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { id } = await params;

  try {
    const category = await getBlogCategoryForTenant(gate.ctx.tenantId, id);
    return NextResponse.json(mobileSuccess({ category }), { status: 200 });
  } catch (error) {
    if (error instanceof BlogCategoryAdminError) {
      return NextResponse.json(mobileError('NOT_FOUND', error.message), { status: error.status });
    }
    console.error('[Mobile blog category GET]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch blog category'), {
      status: 500,
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateBlogCategorySchema.parse({ name: body.name, slug: body.slug });
    const category = await updateBlogCategoryForTenant(gate.ctx.tenantId, id, parsed);
    return NextResponse.json(mobileSuccess({ category }), { status: 200 });
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
      const code = error.status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR';
      return NextResponse.json(mobileError(code, error.message), { status: error.status });
    }
    console.error('[Mobile blog category PUT]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update blog category'), {
      status: 500,
    });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return PUT(request, context);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  const { id } = await params;

  try {
    await deleteBlogCategoryForTenant(gate.ctx.tenantId, id);
    return NextResponse.json(mobileSuccess({ deleted: true }), { status: 200 });
  } catch (error) {
    if (error instanceof BlogCategoryAdminError) {
      const code = error.status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR';
      return NextResponse.json(mobileError(code, error.message), { status: error.status });
    }
    console.error('[Mobile blog category DELETE]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete blog category'), {
      status: 500,
    });
  }
}
