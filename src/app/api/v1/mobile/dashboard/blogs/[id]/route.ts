import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { updateBlogSchema, generateSlug } from '@/lib/content/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const blog = await prisma.blogs.findFirst({
      where: { id, tenant_id: tenantId },
      include: { blog_categories: { select: { id: true, name: true, slug: true } } },
    });

    if (!blog) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Blog not found'), { status: 404 });
    }

    return NextResponse.json(mobileSuccess({ blog }), { status: 200 });
  } catch (e) {
    console.error('[Mobile blog GET]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch blog'), { status: 500 });
  }
}

async function updateBlog(request: NextRequest, params: Promise<{ id: string }>) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const body = await request.json();
    const validatedData = updateBlogSchema.parse(body);

    const existingBlog = await prisma.blogs.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existingBlog) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Blog not found'), { status: 404 });
    }

    const { slug: parsedSlug, ...blogFields } = validatedData;

    let slug = parsedSlug;
    if (validatedData.title && parsedSlug === undefined) {
      slug = generateSlug(validatedData.title);
    }

    if (slug !== undefined) {
      const slugConflict = await prisma.blogs.findFirst({
        where: { tenant_id: tenantId, slug, id: { not: id } },
      });
      if (slugConflict) {
        return NextResponse.json(mobileError('CONFLICT', 'A blog with this slug already exists'), {
          status: 409,
        });
      }
    }

    const blog = await prisma.blogs.update({
      where: { id },
      data: {
        ...blogFields,
        ...(slug !== undefined ? { slug } : {}),
        updated_at: new Date(),
      },
      include: { blog_categories: { select: { id: true, name: true, slug: true } } },
    });

    return NextResponse.json(mobileSuccess({ blog }), { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Validation error',
          e.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        ),
        { status: 400 },
      );
    }
    console.error('[Mobile blog PUT]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update blog'), { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return updateBlog(request, ctx.params);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return updateBlog(request, ctx.params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const existingBlog = await prisma.blogs.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existingBlog) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Blog not found'), { status: 404 });
    }

    await prisma.blogs.delete({ where: { id } });

    return NextResponse.json(mobileSuccess({ message: 'Blog deleted successfully' }), { status: 200 });
  } catch (e) {
    console.error('[Mobile blog DELETE]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete blog'), { status: 500 });
  }
}
