import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff } from '@/lib/auth/mobile-dashboard-tenant';

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  try {
    const refunds = await prisma.payment_logs.findMany({
      where: {
        tenant_id: gate.ctx.tenantId,
        gateway: 'tumizi_refund',
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 200,
    });

    return NextResponse.json(
      mobileSuccess({
        items: refunds.map((row) => {
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
            createdAt: row.created_at?.toISOString() ?? null,
            updatedAt: row.updated_at?.toISOString() ?? null,
          };
        }),
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error('[Mobile Tumizi refunds GET]', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch Tumizi refunds'),
      { status: 500 },
    );
  }
}
