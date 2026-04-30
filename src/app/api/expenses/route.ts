import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import {
  ExpenseCategoryValidationError,
  formatExpense,
  normalizeExpenseCategorySlug,
  resolveExpenseCategoryForTenant,
} from '@/lib/finance/expense-categories';

const createExpenseSchema = z.object({
  expense_date: z.string().min(1),
  category_id: z.string().uuid().optional().nullable(),
  category: z.string().min(1).max(80).optional(),
  amount: z.coerce.number().min(0),
  tax_amount: z.coerce.number().min(0).optional().nullable(),
  payment_method: z.string().max(50).optional().nullable(),
  reference: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine((value) => Boolean(value.category_id || value.category), {
  message: 'category_id or category is required',
  path: ['category'],
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const category = searchParams.get('category');
    const categoryId = searchParams.get('category_id');
    const page = Number(searchParams.get('page') || 1);
    const limit = Math.min(Number(searchParams.get('limit') || 20), 100);
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenant.id };
    if (startDate || endDate) {
      where.expense_date = {};
      if (startDate) where.expense_date.gte = new Date(startDate);
      if (endDate) where.expense_date.lte = new Date(endDate);
    }
    if (categoryId) where.category_id = categoryId;
    if (category) where.category = normalizeExpenseCategorySlug(category);

    const [items, total] = await Promise.all([
      prisma.expenses.findMany({
        where,
        include: { expense_categories: true },
        orderBy: [{ expense_date: 'desc' }, { created_at: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.expenses.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: items.map(formatExpense),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch expenses' } },
      { status: error.status || 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const body = await request.json();
    const input = createExpenseSchema.parse(body);
    const resolvedCategory = await resolveExpenseCategoryForTenant(tenant.id, input, { required: true });

    const expense = await prisma.expenses.create({
      data: {
        tenant_id: tenant.id,
        expense_date: new Date(input.expense_date),
        category_id: resolvedCategory.category_id,
        category: resolvedCategory.category!,
        amount: input.amount,
        tax_amount: input.tax_amount ?? null,
        payment_method: input.payment_method ?? null,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        created_by: user.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: formatExpense(expense),
      },
      { status: 201 },
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { message: 'Validation error', details: error.issues } },
        { status: 400 },
      );
    }
    if (error instanceof ExpenseCategoryValidationError) {
      return NextResponse.json(
        { success: false, error: { message: error.message, details: [{ field: error.field, message: error.message }] } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create expense' } },
      { status: error.status || 500 },
    );
  }
}
