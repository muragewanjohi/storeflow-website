import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';

const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
});

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only tenant users can access mobile dashboard analytics'),
        { status: 403 },
      );
    }

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const { days = 30 } = analyticsQuerySchema.parse({
      days: searchParams.get('days') ?? undefined,
    });

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - (days - 1));
    periodStart.setHours(0, 0, 0, 0);

    const [orders, orderProducts, totalCustomers, newCustomers] = await Promise.all([
      prisma.orders.findMany({
        where: {
          tenant_id: user.tenant_id,
          created_at: { gte: periodStart },
        },
        select: {
          id: true,
          total_amount: true,
          payment_status: true,
          created_at: true,
        },
      }),
      prisma.order_products.findMany({
        where: {
          tenant_id: user.tenant_id,
          orders: {
            created_at: { gte: periodStart },
            payment_status: 'paid',
          },
        },
        select: {
          product_id: true,
          quantity: true,
          total: true,
          products: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.customers.count({
        where: {
          tenant_id: user.tenant_id,
        },
      }),
      prisma.customers.count({
        where: {
          tenant_id: user.tenant_id,
          created_at: { gte: periodStart },
        },
      }),
    ]);

    const paidOrders = orders.filter((order) => order.payment_status === 'paid');
    const totalOrders = orders.length;
    const paidRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);

    const revenueByDate = new Map<string, number>();
    const ordersByDate = new Map<string, number>();

    for (let i = 0; i < days; i += 1) {
      const date = new Date(periodStart);
      date.setDate(periodStart.getDate() + i);
      const key = getDateKey(date);
      revenueByDate.set(key, 0);
      ordersByDate.set(key, 0);
    }

    for (const order of orders) {
      if (!order.created_at) continue;
      const key = getDateKey(order.created_at);
      ordersByDate.set(key, (ordersByDate.get(key) ?? 0) + 1);
      if (order.payment_status === 'paid') {
        revenueByDate.set(key, (revenueByDate.get(key) ?? 0) + Number(order.total_amount ?? 0));
      }
    }

    const productAgg = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const row of orderProducts) {
      const id = row.product_id ?? 'unknown';
      const current = productAgg.get(id) ?? {
        name: row.products?.name ?? 'Unknown Product',
        quantity: 0,
        revenue: 0,
      };
      current.quantity += row.quantity;
      current.revenue += Number(row.total);
      productAgg.set(id, current);
    }

    const topProducts = Array.from(productAgg.entries())
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return NextResponse.json(
      mobileSuccess({
        overview: {
          totalOrders,
          paidOrders: paidOrders.length,
          paidRevenue,
          averageOrderValue: paidOrders.length > 0 ? paidRevenue / paidOrders.length : 0,
          totalCustomers,
          newCustomers,
        },
        trend: Array.from(revenueByDate.keys()).map((date) => ({
          date,
          revenue: revenueByDate.get(date) ?? 0,
          orders: ordersByDate.get(date) ?? 0,
        })),
        topProducts,
        period: {
          days,
          startDate: periodStart.toISOString(),
          endDate: periodEnd.toISOString(),
        },
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid query parameters',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes('Unauthorized mobile request')) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Missing or invalid bearer token'),
        { status: 401 },
      );
    }

    console.error('[Mobile Dashboard Analytics] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch analytics'),
      { status: 500 },
    );
  }
}
