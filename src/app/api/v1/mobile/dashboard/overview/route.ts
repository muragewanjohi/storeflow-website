import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { getDaysUntil, getTrialDaysRemaining, isInTrialPeriod } from '@/lib/subscriptions/trial';

export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only tenant users can access mobile dashboard overview'),
        { status: 403 },
      );
    }

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const tenantRow = await prisma.tenants.findFirst({
      where: { id: user.tenant_id, deleted_at: null },
      select: {
        status: true,
        start_date: true,
        expire_date: true,
        plan_id: true,
        price_plans: {
          select: {
            id: true,
            name: true,
            trial_days: true,
          },
        },
      },
    });

    if (!tenantRow) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Tenant not found'), { status: 404 });
    }

    const trialDays = tenantRow.price_plans?.trial_days ?? null;
    const startDateIso = tenantRow.start_date?.toISOString() ?? null;
    const expireDateIso = tenantRow.expire_date?.toISOString() ?? null;
    const trialDaysRemaining = getTrialDaysRemaining({
      trialDays,
      startDate: tenantRow.start_date,
      expireDate: tenantRow.expire_date,
    });

    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalOrders,
      pendingOrders,
      totalCustomers,
      monthlyPaidRevenueAgg,
      recentOrders,
    ] = await Promise.all([
      prisma.products.count({
        where: { tenant_id: user.tenant_id },
      }),
      prisma.products.count({
        where: { tenant_id: user.tenant_id, status: 'active' },
      }),
      prisma.products.count({
        where: {
          tenant_id: user.tenant_id,
          stock_quantity: { gt: 0, lte: 10 },
        },
      }),
      prisma.products.count({
        where: {
          tenant_id: user.tenant_id,
          stock_quantity: { lte: 0 },
        },
      }),
      prisma.orders.count({
        where: { tenant_id: user.tenant_id },
      }),
      prisma.orders.count({
        where: { tenant_id: user.tenant_id, status: 'pending' },
      }),
      prisma.customers.count({
        where: { tenant_id: user.tenant_id },
      }),
      prisma.orders.aggregate({
        _sum: { total_amount: true },
        where: {
          tenant_id: user.tenant_id,
          payment_status: 'paid',
          created_at: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      }),
      prisma.orders.findMany({
        where: { tenant_id: user.tenant_id },
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          id: true,
          order_number: true,
          name: true,
          total_amount: true,
          status: true,
          payment_status: true,
          created_at: true,
        },
      }),
    ]);

    return NextResponse.json(
      mobileSuccess({
        metrics: {
          products: {
            total: totalProducts,
            active: activeProducts,
            lowStock: lowStockProducts,
            outOfStock: outOfStockProducts,
          },
          orders: {
            total: totalOrders,
            pending: pendingOrders,
          },
          customers: {
            total: totalCustomers,
          },
          revenue: {
            monthlyPaid: Number(monthlyPaidRevenueAgg._sum.total_amount ?? 0),
            monthStart: monthStart.toISOString(),
            monthEnd: monthEnd.toISOString(),
          },
        },
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          orderNumber: order.order_number,
          customerName: order.name,
          totalAmount: Number(order.total_amount),
          status: order.status ?? 'pending',
          paymentStatus: order.payment_status ?? 'pending',
          createdAt: order.created_at?.toISOString() ?? null,
        })),
        subscription: {
          status: tenantRow.status ?? 'active',
          planId: tenantRow.plan_id,
          planName: tenantRow.price_plans?.name ?? null,
          trialDays,
          trialDaysRemaining,
          inTrial: isInTrialPeriod({
            trialDays,
            startDate: tenantRow.start_date,
            expireDate: tenantRow.expire_date,
          }),
          startDate: startDateIso,
          expireDate: expireDateIso,
          daysUntilExpire: expireDateIso ? getDaysUntil(expireDateIso) : null,
        },
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized mobile request')) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Missing or invalid bearer token'),
        { status: 401 },
      );
    }

    console.error('[Mobile Dashboard Overview] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch dashboard overview'),
      { status: 500 },
    );
  }
}

