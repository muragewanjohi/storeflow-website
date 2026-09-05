import { NextResponse } from 'next/server';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export async function GET() {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin', 'tenant_staff']);
    const tenant = await requireTenant();

    const refunds = await prisma.payment_logs.findMany({
      where: {
        tenant_id: tenant.id,
        gateway: 'tumizi_refund',
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 200,
    });

    return NextResponse.json({
      success: true,
      data: refunds.map((row) => {
        const metadata = (row.metadata ?? {}) as Record<string, unknown>;
        return {
          id: row.id,
          status: row.status,
          amount: Number(row.amount),
          currency: row.currency,
          externalReference: row.payment_id,
          refundReference: row.transaction_id,
          orderId: typeof metadata.order_id === 'string' ? metadata.order_id : null,
          orderNumber: typeof metadata.order_number === 'string' ? metadata.order_number : null,
          originalPaymentReference:
            typeof metadata.original_payment_reference === 'string'
              ? metadata.original_payment_reference
              : null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch Tumizi refunds' },
      { status: error.status || 500 },
    );
  }
}
