import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { blogQuerySchema, createBlogSchema, generateSlug } from '@/lib/content/validation';

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
    const validatedQuery = blogQuerySchema.parse(queryParams);
    const page = validatedQuery.page ?? 1;
    const limit = validatedQuery.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.blogsWhereInput = { tenant_id: tenantId };
    if (validatedQuery.search) {
      where.OR = [
        { title: { contains: validatedQuery.search, mode: 'insensitive' } },
        { slug: { contains: validatedQuery.search, mode: 'insensitive' } },
        { excerpt: { contains: validatedQuery.search, mode: 'insensitive' } },
      ];
    }
    if (validatedQuery.status) {
      where.status = validatedQuery.status;
    }
    if (validatedQuery.category_id) {
      where.category_id = validatedQuery.category_id;
    }

    const orderBy: Prisma.blogsOrderByWithRelationInput = {
      [validatedQuery.sort_by ?? 'created_at']: validatedQuery.sort_order ?? 'desc',
    };

    const [blogs, total] = await Promise.all([
      prisma.blogs.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          blog_categories: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.blogs.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return NextResponse.json(
      mobileSuccess({ items: blogs }, { page, limit, total, totalPages }),
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
    console.error('[Mobile blogs GET]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to list blogs'), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;

  try {
    const body = await request.json();
    const validatedData = createBlogSchema.parse(body);
    const slug =
      (validatedData.slug ?? generateSlug(validatedData.title)) || `blog-${Date.now()}`;

    const existingBlog = await prisma.blogs.findFirst({
      where: { tenant_id: tenantId, slug },
    });
    if (existingBlog) {
      return NextResponse.json(mobileError('CONFLICT', 'A blog with this slug already exists'), {
        status: 409,
      });
    }

    const blog = await prisma.blogs.create({
      data: {
        tenant_id: tenantId,
        title: validatedData.title,
        slug,
        content: validatedData.content || null,
        excerpt: validatedData.excerpt || null,
        category_id: validatedData.category_id || null,
        image: validatedData.image || null,
        meta_title: validatedData.meta_title || null,
        meta_description: validatedData.meta_description || null,
        meta_tags: validatedData.meta_tags || null,
        status: validatedData.status || 'draft',
      },
      include: {
        blog_categories: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json(mobileSuccess({ blog }), { status: 201 });
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
    console.error('[Mobile blogs POST]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to create blog'), { status: 500 });
  }
}
