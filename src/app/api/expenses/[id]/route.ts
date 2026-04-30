import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import {
  ExpenseCategoryValidationError,
  formatExpense,
  resolveExpenseCategoryForTenant,
} from '@/lib/finance/expense-categories';

const updateExpenseSchema = z.object({
  expense_date: z.string().optional(),
  category_id: z.string().uuid().optional().nullable(),
  category: z.string().min(1).max(80).optional(),
  amount: z.coerce.number().min(0).optional(),
  tax_amount: z.coerce.number().min(0).optional().nullable(),
  payment_method: z.string().max(50).optional().nullable(),
  reference: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;
    const body = await request.json();
    const input = updateExpenseSchema.parse(body);
    const resolvedCategory = await resolveExpenseCategoryForTenant(tenant.id, input, { required: false });

    const existing = await prisma.expenses.findFirst({
      where: { id, tenant_id: tenant.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: { message: 'Expense not found' } }, { status: 404 });
    }

    const updated = await prisma.expenses.update({
      where: { id },
      include: { expense_categories: true },
      data: {
        ...(input.expense_date !== undefined ? { expense_date: new Date(input.expense_date) } : {}),
        ...(resolvedCategory.category !== undefined ? { category: resolvedCategory.category } : {}),
        ...(resolvedCategory.category_id !== undefined ? { category_id: resolvedCategory.category_id } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.tax_amount !== undefined ? { tax_amount: input.tax_amount } : {}),
        ...(input.payment_method !== undefined ? { payment_method: input.payment_method } : {}),
        ...(input.reference !== undefined ? { reference: input.reference } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: formatExpense(updated),
    });
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
      { success: false, error: { message: error.message || 'Failed to update expense' } },
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

    const existing = await prisma.expenses.findFirst({
      where: { id, tenant_id: tenant.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: { message: 'Expense not found' } }, { status: 404 });
    }

    await prisma.expenses.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to delete expense' } },
      { status: error.status || 500 },
    );
  }
}
