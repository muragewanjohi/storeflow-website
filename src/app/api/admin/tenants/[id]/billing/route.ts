/**
 * Tenant Billing History API Route
 *
 * GET /api/admin/tenants/[id]/billing — subscription payment logs per tenant (all channels).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { TUMIZI_SUBSCRIPTION_GATEWAY } from '@/lib/subscriptions/tumizi-subscription';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const SUBSCRIPTION_GATEWAYS = [
  'mpesa_buy_goods',
  'pesapal',
  TUMIZI_SUBSCRIPTION_GATEWAY,
] as const;

type SubscriptionGateway = (typeof SUBSCRIPTION_GATEWAYS)[number];

function mapPaymentLog(log: {
  id: string;
  gateway: string | null;
  amount: unknown;
  currency: string | null;
  status: string | null;
  payment_id: string | null;
  transaction_id: string | null;
  metadata: unknown;
  created_at: Date | null;
  updated_at: Date | null;
}) {
  const meta =
    log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
      ? (log.metadata as Record<string, unknown>)
      : null;
  const planName = meta && typeof meta.plan_name === 'string' ? meta.plan_name : null;

  return {
    id: log.id,
    gateway: log.gateway,
    amount: Number(log.amount),
    currency: log.currency,
    status: log.status,
    payment_id: log.payment_id,
    transaction_id: log.transaction_id,
    plan_name: planName,
    created_at: log.created_at?.toISOString() ?? null,
    updated_at: log.updated_at?.toISOString() ?? null,
  };
}

function groupByGateway(
  logs: ReturnType<typeof mapPaymentLog>[],
): Record<SubscriptionGateway, ReturnType<typeof mapPaymentLog>[]> {
  return {
    mpesa_buy_goods: logs.filter((log) => log.gateway === 'mpesa_buy_goods'),
    pesapal: logs.filter((log) => log.gateway === 'pesapal'),
    [TUMIZI_SUBSCRIPTION_GATEWAY]: logs.filter(
      (log) => log.gateway === TUMIZI_SUBSCRIPTION_GATEWAY,
    ),
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const { id } = await params;

    const tenant = await prisma.tenants.findUnique({
      where: { id },
      include: {
        price_plans: {
          select: {
            id: true,
            name: true,
            price: true,
            duration_months: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
    }

    const paymentLogs = await prisma.payment_logs.findMany({
      where: {
        tenant_id: id,
        gateway: { in: [...SUBSCRIPTION_GATEWAYS] },
      },
      orderBy: { created_at: 'desc' },
      take: 150,
      select: {
        id: true,
        gateway: true,
        amount: true,
        currency: true,
        status: true,
        payment_id: true,
        transaction_id: true,
        metadata: true,
        created_at: true,
        updated_at: true,
      },
    });

    const transactions = paymentLogs.map(mapPaymentLog);
    const payments = groupByGateway(transactions);

    return NextResponse.json(
      {
        tenant: {
          id: tenant.id,
          name: tenant.name,
        },
        currentPlan: tenant.price_plans,
        subscriptionStatus: tenant.status,
        expireDate: tenant.expire_date,
        payments: {
          mpesa: payments.mpesa_buy_goods,
          pesapal: payments.pesapal,
          tumizi: payments[TUMIZI_SUBSCRIPTION_GATEWAY],
        },
        transactions,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error fetching billing history:', error);

    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { message: 'Access denied. Landlord role required.' },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(
      {
        message:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Internal server error'
            : 'Failed to fetch billing history',
      },
      { status: 500 },
    );
  }
}
