import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { normalizeExpenseCategorySlug } from '@/lib/finance/expense-categories';

const updateExpenseCategorySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  slug: z.string().max(80).optional(),
  description: z.string().optional().nullable(),
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
    const category = await prisma.expense_categories.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!category) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Expense category not found'), { status: 404 });
    }

    return NextResponse.json(mobileSuccess({ category }), { status: 200 });
  } catch (error) {
    console.error('[Mobile expense category GET]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch expense category'), { status: 500 });
  }
}

async function updateExpenseCategory(request: NextRequest, params: Promise<{ id: string }>) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const input = updateExpenseCategorySchema.parse(await request.json());
    const existing = await prisma.expense_categories.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Expense category not found'), { status: 404 });
    }

    const nextSlug = input.slug
      ? normalizeExpenseCategorySlug(input.slug)
      : input.name
        ? normalizeExpenseCategorySlug(input.name)
        : existing.slug;
    if (!nextSlug) {
      return NextResponse.json(
        mobileError('VALIDATION_ERROR', 'Category slug is required', [
          { field: 'slug', message: 'Category slug is required' },
        ]),
        { status: 400 },
      );
    }

    if (nextSlug !== existing.slug) {
      const slugExists = await prisma.expense_categories.findFirst({
        where: { tenant_id: tenantId, slug: nextSlug, id: { not: id } },
      });
      if (slugExists) {
        return NextResponse.json(mobileError('CONFLICT', 'An expense category with this slug already exists'), {
          status: 409,
        });
      }
    }

    const category = await prisma.expense_categories.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(nextSlug !== existing.slug ? { slug: nextSlug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });

    if (nextSlug !== existing.slug) {
      await prisma.expenses.updateMany({
        where: { tenant_id: tenantId, category_id: id },
        data: { category: nextSlug },
      });
    }

    return NextResponse.json(mobileSuccess({ category }), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Validation error',
          error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        ),
        { status: 400 },
      );
    }
    console.error('[Mobile expense category PATCH]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update expense category'), { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return updateExpenseCategory(request, ctx.params);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return updateExpenseCategory(request, ctx.params);
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
    const category = await prisma.expense_categories.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!category) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Expense category not found'), { status: 404 });
    }

    const expensesCount = await prisma.expenses.count({
      where: {
        tenant_id: tenantId,
        OR: [{ category_id: id }, { category: category.slug }],
      },
    });
    if (expensesCount > 0) {
      return NextResponse.json(
        mobileError('BAD_REQUEST', `Cannot delete category. It is used by ${expensesCount} expense(s).`),
        { status: 400 },
      );
    }

    await prisma.expense_categories.delete({ where: { id } });
    return NextResponse.json(mobileSuccess({ id }), { status: 200 });
  } catch (error) {
    console.error('[Mobile expense category DELETE]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete expense category'), { status: 500 });
  }
}
