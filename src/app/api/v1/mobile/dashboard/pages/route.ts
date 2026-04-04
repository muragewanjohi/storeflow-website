import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { createPageSchema, generateSlug, pageQuerySchema } from '@/lib/content/validation';
import { canCreatePage } from '@/lib/subscriptions/limits';

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;

  try {
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, string> = {};
    for (const [k, v] of searchParams.entries()) {
      queryParams[k] = v;
    }
    const validatedQuery = pageQuerySchema.parse(queryParams);
    const page = validatedQuery.page ?? 1;
    const limit = validatedQuery.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.pagesWhereInput = { tenant_id: tenantId };
    if (validatedQuery.search) {
      where.OR = [
        { title: { contains: validatedQuery.search, mode: 'insensitive' } },
        { slug: { contains: validatedQuery.search, mode: 'insensitive' } },
      ];
    }
    if (validatedQuery.status) {
      where.status = validatedQuery.status;
    }

    const sortBy = validatedQuery.sort_by ?? 'created_at';
    const sortOrder = validatedQuery.sort_order ?? 'desc';
    const orderBy: Prisma.pagesOrderByWithRelationInput = { [sortBy]: sortOrder };

    const [items, total] = await Promise.all([
      prisma.pages.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      }),
      prisma.pages.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return NextResponse.json(
      mobileSuccess({ items }, { page, limit, total, totalPages }),
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid query',
          e.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        ),
        { status: 400 },
      );
    }
    console.error('[Mobile pages GET]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to list pages'), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId, tenant } = gate.ctx;

  try {
    const body = await request.json();
    const validatedData = createPageSchema.parse(body);
    const slug = validatedData.slug || generateSlug(validatedData.title);

    const existingPage = await prisma.pages.findFirst({
      where: { tenant_id: tenantId, slug },
    });
    if (existingPage) {
      return NextResponse.json(mobileError('CONFLICT', 'A page with this slug already exists'), {
        status: 409,
      });
    }

    const limitCheck = await canCreatePage(tenant);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        mobileError('FORBIDDEN', limitCheck.reason || 'Page limit reached'),
        { status: 403 },
      );
    }

    const status = validatedData.status || 'draft';
    const content = validatedData.content || null;
    const publishedContent = status === 'published' && content ? content : null;

    const page = await prisma.pages.create({
      data: {
        tenant_id: tenantId,
        title: validatedData.title,
        slug,
        content,
        published_content: publishedContent,
        banner_image: validatedData.banner_image || null,
        meta_title: validatedData.meta_title || null,
        meta_description: validatedData.meta_description || null,
        meta_tags: validatedData.meta_tags || null,
        status,
      },
    });

    return NextResponse.json(mobileSuccess({ page }), { status: 201 });
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
    console.error('[Mobile pages POST]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to create page'), { status: 500 });
  }
}
