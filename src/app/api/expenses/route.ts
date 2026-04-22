import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

const expenseCategoryValues = [
  'ads_marketing',
  'shipping_fulfillment',
  'packaging',
  'software_apps',
  'salaries_contractors',
  'rent_utilities',
  'misc',
] as const;

const createExpenseSchema = z.object({
  expense_date: z.string().min(1),
  category: z.enum(expenseCategoryValues),
  amount: z.coerce.number().min(0),
  tax_amount: z.coerce.number().min(0).optional().nullable(),
  payment_method: z.string().max(50).optional().nullable(),
  reference: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const category = searchParams.get('category');
    const page = Number(searchParams.get('page') || 1);
    const limit = Math.min(Number(searchParams.get('limit') || 20), 100);
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenant.id };
    if (startDate || endDate) {
      where.expense_date = {};
      if (startDate) where.expense_date.gte = new Date(startDate);
      if (endDate) where.expense_date.lte = new Date(endDate);
    }
    if (category && expenseCategoryValues.includes(category as any)) {
      where.category = category;
    }

    const [items, total] = await Promise.all([
      prisma.expenses.findMany({
        where,
        orderBy: [{ expense_date: 'desc' }, { created_at: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.expenses.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: items.map((expense) => ({
          ...expense,
          amount: Number(expense.amount),
          tax_amount: expense.tax_amount != null ? Number(expense.tax_amount) : null,
        })),
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

    const expense = await prisma.expenses.create({
      data: {
        tenant_id: tenant.id,
        expense_date: new Date(input.expense_date),
        category: input.category,
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
        data: {
          ...expense,
          amount: Number(expense.amount),
          tax_amount: expense.tax_amount != null ? Number(expense.tax_amount) : null,
        },
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
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create expense' } },
      { status: error.status || 500 },
    );
  }
}
