import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
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
  try {
    await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;

    const category = await prisma.expense_categories.findFirst({
      where: { id, tenant_id: tenant.id },
    });
    if (!category) {
      return NextResponse.json({ success: false, error: { message: 'Expense category not found' } }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { category } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch expense category' } },
      { status: error.status || 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;
    const input = updateExpenseCategorySchema.parse(await request.json());

    const existing = await prisma.expense_categories.findFirst({
      where: { id, tenant_id: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: { message: 'Expense category not found' } }, { status: 404 });
    }

    const nextSlug = input.slug
      ? normalizeExpenseCategorySlug(input.slug)
      : input.name
        ? normalizeExpenseCategorySlug(input.name)
        : existing.slug;
    if (!nextSlug) {
      return NextResponse.json(
        { success: false, error: { message: 'Category slug is required' } },
        { status: 400 },
      );
    }

    if (nextSlug !== existing.slug) {
      const slugExists = await prisma.expense_categories.findFirst({
        where: { tenant_id: tenant.id, slug: nextSlug, id: { not: id } },
      });
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: { message: 'An expense category with this slug already exists' } },
          { status: 409 },
        );
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
        where: { tenant_id: tenant.id, category_id: id },
        data: { category: nextSlug },
      });
    }

    return NextResponse.json({ success: true, data: { category } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { message: 'Validation error', details: error.issues } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update expense category' } },
      { status: error.status || 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;

    const category = await prisma.expense_categories.findFirst({
      where: { id, tenant_id: tenant.id },
    });
    if (!category) {
      return NextResponse.json({ success: false, error: { message: 'Expense category not found' } }, { status: 404 });
    }

    const expensesCount = await prisma.expenses.count({
      where: {
        tenant_id: tenant.id,
        OR: [{ category_id: id }, { category: category.slug }],
      },
    });
    if (expensesCount > 0) {
      return NextResponse.json(
        { success: false, error: { message: `Cannot delete category. It is used by ${expensesCount} expense(s).` } },
        { status: 400 },
      );
    }

    await prisma.expense_categories.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to delete expense category' } },
      { status: error.status || 500 },
    );
  }
}
