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

const updateExpenseSchema = z.object({
  expense_date: z.string().optional(),
  category: z.enum(expenseCategoryValues).optional(),
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
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const body = await request.json();
    const input = updateExpenseSchema.parse(body);

    const existing = await prisma.expenses.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Expense not found'), { status: 404 });
    }

    const updated = await prisma.expenses.update({
      where: { id },
      data: {
        ...(input.expense_date !== undefined ? { expense_date: new Date(input.expense_date) } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.tax_amount !== undefined ? { tax_amount: input.tax_amount } : {}),
        ...(input.payment_method !== undefined ? { payment_method: input.payment_method } : {}),
        ...(input.reference !== undefined ? { reference: input.reference } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });

    return NextResponse.json(
      mobileSuccess({
        ...updated,
        amount: Number(updated.amount),
        tax_amount: updated.tax_amount != null ? Number(updated.tax_amount) : null,
      }),
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
    console.error('[Mobile Expenses PATCH]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update expense'), { status: 500 });
  }
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
    const existing = await prisma.expenses.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Expense not found'), { status: 404 });
    }
    await prisma.expenses.delete({ where: { id } });
    return NextResponse.json(mobileSuccess({ id }));
  } catch (error) {
    console.error('[Mobile Expenses DELETE]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete expense'), { status: 500 });
  }
}
