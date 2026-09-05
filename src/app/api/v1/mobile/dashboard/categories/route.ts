import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { generateSlug } from '@/lib/products/validation';

const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255),
  slug: z.string().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  image: z.string().url().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active').optional(),
});

const categoryQuerySchema = z.object({
  parent_id: z.string().uuid().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  include_children: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;

  try {
    const { searchParams } = new URL(request.url);
    const validatedQuery = categoryQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    const where: Prisma.categoriesWhereInput = { tenant_id: tenantId };

    if (validatedQuery.parent_id !== undefined) {
      where.parent_id = validatedQuery.parent_id;
    } else if (!validatedQuery.include_children) {
      where.parent_id = null;
    }

    if (validatedQuery.status) {
      where.status = validatedQuery.status;
    }

    const categories = await prisma.categories.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        other_categories: validatedQuery.include_children
          ? {
              select: { id: true, name: true, slug: true, parent_id: true, status: true },
            }
          : false,
      },
    });

    return NextResponse.json(mobileSuccess({ categories }), { status: 200 });
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
    console.error('[Mobile categories GET]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to list categories'), { status: 500 });
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
    const validatedData = createCategorySchema.parse(body);
    const slug = validatedData.slug || generateSlug(validatedData.name);

    const existingCategory = await prisma.categories.findFirst({
      where: { tenant_id: tenantId, slug },
    });
    if (existingCategory) {
      return NextResponse.json(mobileError('CONFLICT', 'A category with this slug already exists'), {
        status: 409,
      });
    }

    if (validatedData.parent_id) {
      const parentCategory = await prisma.categories.findFirst({
        where: { id: validatedData.parent_id, tenant_id: tenantId },
      });
      if (!parentCategory) {
        return NextResponse.json(
          mobileError('VALIDATION_ERROR', 'Parent category not found', [
            { field: 'parent_id', message: 'Invalid parent' },
          ]),
          { status: 400 },
        );
      }
    }

    const category = await prisma.categories.create({
      data: {
        tenant_id: tenantId,
        name: validatedData.name,
        slug,
        parent_id: validatedData.parent_id || null,
        image: validatedData.image || null,
        status: validatedData.status || 'active',
      },
    });

    return NextResponse.json(mobileSuccess({ category }), { status: 201 });
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
    console.error('[Mobile categories POST]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to create category'), { status: 500 });
  }
}
