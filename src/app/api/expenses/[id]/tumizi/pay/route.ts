import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { tumiziClient } from '@/lib/tumizi/client';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';

const requestSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  amount: z.coerce.number().positive().optional(),
  narration: z.string().max(255).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin', 'tenant_staff']);
    const tenant = await requireTenant();
    const { id: expenseId } = await params;
    const payload = requestSchema.parse(await request.json());

    const [expense, tumiziConfig] = await Promise.all([
      prisma.expenses.findFirst({
        where: { id: expenseId, tenant_id: tenant.id },
      }),
      getTumiziTenantConfigByTenantId(tenant.id),
    ]);

    if (!expense) {
      return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 });
    }

    if (!tumiziConfig?.enabled || !tumiziConfig.merchantExternalId) {
      return NextResponse.json(
        { success: false, error: 'Tumizi is not enabled for this store' },
        { status: 400 },
      );
    }

    const amount = payload.amount ?? Number(expense.amount);
    const externalReference = `expense-${expense.id}-${Date.now()}`;
    const response = await tumiziClient.createWithdrawal({
      merchant_external_id: tumiziConfig.merchantExternalId,
      external_reference: externalReference,
      phone_number: payload.phoneNumber,
      amount,
      currency: 'KES',
      narration: payload.narration || `Expense payout: ${expense.category}`,
    });

    const withdrawalReference =
      (response?.data as Record<string, unknown> | undefined)?.withdrawal_reference ||
      response['withdrawal_reference'];

    await prisma.payment_logs.create({
      data: {
        tenant_id: tenant.id,
        user_id: user.id,
        gateway: 'tumizi_withdrawal',
        amount,
        currency: 'KES',
        status: 'pending',
        payment_id: externalReference,
        transaction_id: typeof withdrawalReference === 'string' ? withdrawalReference : null,
        metadata: {
          expense_id: expense.id,
          category: expense.category,
          source: 'tumizi_expense_payment',
          external_reference: externalReference,
          response,
        } as any,
      },
    });

    await prisma.expenses.update({
      where: { id: expense.id },
      data: {
        payment_method: 'tumizi',
        reference: externalReference,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        expenseId: expense.id,
        externalReference,
        response,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to pay expense via Tumizi' },
      { status: error.status || 500 },
    );
  }
}
