import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { generateSlug } from '@/lib/products/validation';

const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  image: z.string().url().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const category = await prisma.categories.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        other_categories: {
          select: { id: true, name: true, slug: true, parent_id: true, status: true },
        },
        categories: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!category) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Category not found'), { status: 404 });
    }

    return NextResponse.json(mobileSuccess({ category }), { status: 200 });
  } catch (e) {
    console.error('[Mobile category GET]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch category'), { status: 500 });
  }
}

async function putCategory(request: NextRequest, params: Promise<{ id: string }>) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const body = await request.json();
    const validatedData = updateCategorySchema.parse(body);

    const existingCategory = await prisma.categories.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existingCategory) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Category not found'), { status: 404 });
    }

    let slug = existingCategory.slug;
    if (validatedData.name && validatedData.name !== existingCategory.name) {
      slug = validatedData.slug || generateSlug(validatedData.name);
      const slugExists = await prisma.categories.findFirst({
        where: { tenant_id: tenantId, slug, id: { not: id } },
      });
      if (slugExists) {
        return NextResponse.json(mobileError('CONFLICT', 'A category with this slug already exists'), {
          status: 409,
        });
      }
    }

    if (validatedData.parent_id !== undefined && validatedData.parent_id !== null) {
      if (validatedData.parent_id === id) {
        return NextResponse.json(
          mobileError('VALIDATION_ERROR', 'Category cannot be its own parent', [
            { field: 'parent_id', message: 'Invalid parent' },
          ]),
          { status: 400 },
        );
      }
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

    const updateData: Record<string, unknown> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (slug !== existingCategory.slug) updateData.slug = slug;
    if (validatedData.parent_id !== undefined) updateData.parent_id = validatedData.parent_id;
    if (validatedData.image !== undefined) updateData.image = validatedData.image;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;

    const category = await prisma.categories.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.categories.update>[0]['data'],
    });

    return NextResponse.json(
      mobileSuccess({ message: 'Category updated successfully', category }),
      { status: 200 },
    );
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
    console.error('[Mobile category PUT]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update category'), { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return putCategory(request, ctx.params);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return putCategory(request, ctx.params);
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
    const category = await prisma.categories.findFirst({
      where: { id, tenant_id: tenantId },
      include: { other_categories: true },
    });

    if (!category) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Category not found'), { status: 404 });
    }

    if (category.other_categories && category.other_categories.length > 0) {
      return NextResponse.json(
        mobileError(
          'BAD_REQUEST',
          'Cannot delete category with subcategories. Delete or move subcategories first.',
        ),
        { status: 400 },
      );
    }

    const productsCount = await prisma.products.count({
      where: { tenant_id: tenantId, category_id: id },
    });

    if (productsCount > 0) {
      return NextResponse.json(
        mobileError(
          'BAD_REQUEST',
          `Cannot delete category. It is used by ${productsCount} product(s).`,
        ),
        { status: 400 },
      );
    }

    await prisma.categories.delete({ where: { id } });

    return NextResponse.json(mobileSuccess({ message: 'Category deleted successfully' }), { status: 200 });
  } catch (e) {
    console.error('[Mobile category DELETE]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete category'), { status: 500 });
  }
}
