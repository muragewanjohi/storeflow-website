import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { generateSlug, updatePageSchema } from '@/lib/content/validation';

const PROTECTED_PAGE_SLUGS = ['home', 'about', 'contact'];

function revalidatePageCache(
  page: { slug: string | null },
  existingSlug: string | null | undefined,
) {
  try {
    if (page.slug) {
      revalidatePath(`/${page.slug}`);
    }
    if (existingSlug && existingSlug !== page.slug) {
      revalidatePath(`/${existingSlug}`);
    }
    if (page.slug === 'home' || page.slug === '') {
      revalidatePath('/');
    }
  } catch (e) {
    console.warn('[Mobile page] revalidatePath failed:', e);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const page = await prisma.pages.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!page) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Page not found'), { status: 404 });
    }
    return NextResponse.json(mobileSuccess({ page }), { status: 200 });
  } catch (e) {
    console.error('[Mobile page GET]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch page'), { status: 500 });
  }
}

async function updatePage(request: NextRequest, params: Promise<{ id: string }>) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const body = await request.json();
    const validatedData = updatePageSchema.parse(body);

    const existingPage = await prisma.pages.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existingPage) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Page not found'), { status: 404 });
    }

    let slug = validatedData.slug;
    if (validatedData.title !== undefined && slug === undefined) {
      slug = generateSlug(validatedData.title);
    } else if (slug === undefined) {
      slug = existingPage.slug ?? undefined;
    }

    if (slug && slug !== existingPage.slug) {
      const slugExists = await prisma.pages.findFirst({
        where: {
          tenant_id: tenantId,
          slug,
          id: { not: id },
        },
      });
      if (slugExists) {
        return NextResponse.json(mobileError('CONFLICT', 'A page with this slug already exists'), {
          status: 409,
        });
      }
    }

    const contentToSave =
      validatedData.content !== undefined ? validatedData.content : existingPage.content;
    const isPublishing = validatedData.status === 'published';
    const publishedContentUpdate = isPublishing
      ? { published_content: contentToSave ?? existingPage.published_content }
      : !existingPage.published_content && existingPage.content
        ? { published_content: existingPage.content }
        : {};

    const page = await prisma.pages.update({
      where: { id },
      data: {
        title: validatedData.title !== undefined ? validatedData.title : undefined,
        slug: slug !== undefined ? slug : undefined,
        content: validatedData.content !== undefined ? validatedData.content : undefined,
        ...publishedContentUpdate,
        banner_image:
          validatedData.banner_image !== undefined
            ? validatedData.banner_image || null
            : undefined,
        meta_title: validatedData.meta_title !== undefined ? validatedData.meta_title : undefined,
        meta_description:
          validatedData.meta_description !== undefined ? validatedData.meta_description : undefined,
        meta_tags: validatedData.meta_tags !== undefined ? validatedData.meta_tags : undefined,
        status: validatedData.status !== undefined ? validatedData.status : undefined,
        updated_at: new Date(),
      },
    });

    revalidatePageCache(page, existingPage.slug);

    return NextResponse.json(mobileSuccess({ page }), { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid body',
          e.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        ),
        { status: 400 },
      );
    }
    console.error('[Mobile page PUT/PATCH]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update page'), { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return updatePage(request, context.params);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return updatePage(request, context.params);
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
    const page = await prisma.pages.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!page) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Page not found'), { status: 404 });
    }

    const pageSlugLower = page.slug?.toLowerCase() || '';
    if (PROTECTED_PAGE_SLUGS.includes(pageSlugLower)) {
      return NextResponse.json(
        mobileError(
          'FORBIDDEN',
          `Cannot delete "${page.title}". This is a required system page and cannot be removed.`,
        ),
        { status: 403 },
      );
    }

    revalidatePageCache(page, page.slug);

    await prisma.pages.delete({ where: { id } });
    return NextResponse.json(mobileSuccess({ deleted: true }), { status: 200 });
  } catch (e) {
    console.error('[Mobile page DELETE]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete page'), { status: 500 });
  }
}
