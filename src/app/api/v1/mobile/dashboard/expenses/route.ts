import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';

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
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const category = searchParams.get('category');
    const page = Number(searchParams.get('page') || 1);
    const limit = Math.min(Number(searchParams.get('limit') || 20), 100);
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenantId };
    if (startDate || endDate) {
      where.expense_date = {};
      if (startDate) where.expense_date.gte = new Date(startDate);
      if (endDate) where.expense_date.lte = new Date(endDate);
    }
    if (category && expenseCategoryValues.includes(category as any)) where.category = category;

    const [items, total] = await Promise.all([
      prisma.expenses.findMany({
        where,
        orderBy: [{ expense_date: 'desc' }, { created_at: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.expenses.count({ where }),
    ]);

    return NextResponse.json(
      mobileSuccess(
        {
          items: items.map((expense) => ({
            ...expense,
            amount: Number(expense.amount),
            tax_amount: expense.tax_amount != null ? Number(expense.tax_amount) : null,
          })),
        },
        {
          page,
          limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
      ),
    );
  } catch (error) {
    console.error('[Mobile Expenses GET]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch expenses'), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId, user } = gate.ctx;

  try {
    const body = await request.json();
    const input = createExpenseSchema.parse(body);

    const expense = await prisma.expenses.create({
      data: {
        tenant_id: tenantId,
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
      mobileSuccess({
        ...expense,
        amount: Number(expense.amount),
        tax_amount: expense.tax_amount != null ? Number(expense.tax_amount) : null,
      }),
      { status: 201 },
    );
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
    console.error('[Mobile Expenses POST]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to create expense'), { status: 500 });
  }
}
