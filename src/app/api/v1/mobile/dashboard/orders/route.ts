import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { orderQuerySchema } from '@/lib/orders/validation';

export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only tenant users can access mobile dashboard orders'),
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
    const getParam = (key: string): string | undefined => {
      const value = searchParams.get(key);
      return value === null ? undefined : value;
    };

    const query = orderQuerySchema.parse({
      page: getParam('page'),
      limit: getParam('limit'),
      search: getParam('search'),
      status: getParam('status'),
      payment_status: getParam('payment_status'),
      order_number: getParam('order_number'),
      customer_email: getParam('customer_email'),
      start_date: getParam('start_date'),
      end_date: getParam('end_date'),
      sort_by: getParam('sort_by'),
      sort_order: getParam('sort_order'),
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ordersWhereInput = {
      tenant_id: user.tenant_id,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.payment_status) {
      where.payment_status = query.payment_status;
    }

    if (query.order_number?.trim()) {
      where.order_number = {
        contains: query.order_number.trim(),
        mode: 'insensitive',
      };
    }

    if (query.customer_email?.trim()) {
      where.email = {
        contains: query.customer_email.trim(),
        mode: 'insensitive',
      };
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { order_number: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.start_date || query.end_date) {
      where.created_at = {};
      if (query.start_date) {
        where.created_at.gte = new Date(query.start_date);
      }
      if (query.end_date) {
        where.created_at.lte = new Date(query.end_date);
      }
    }

    const orderBy: Prisma.ordersOrderByWithRelationInput = {
      [query.sort_by ?? 'created_at']: query.sort_order ?? 'desc',
    };

    const [orders, total] = await Promise.all([
      prisma.orders.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          order_products: {
            select: {
              quantity: true,
            },
          },
        },
      }),
      prisma.orders.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return NextResponse.json(
      mobileSuccess(
        {
          items: orders.map((order) => ({
            id: order.id,
            orderNumber: order.order_number,
            name: order.name,
            email: order.email,
            phone: order.phone,
            totalAmount: Number(order.total_amount),
            status: order.status ?? 'pending',
            paymentStatus: order.payment_status ?? 'pending',
            paymentGateway: order.payment_gateway,
            itemCount: order.order_products.reduce((sum, item) => sum + (item.quantity ?? 0), 0),
            createdAt: order.created_at?.toISOString() ?? null,
            updatedAt: order.updated_at?.toISOString() ?? null,
          })),
        },
        {
          page,
          limit,
          total,
          totalPages,
        },
      ),
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

    console.error('[Mobile Dashboard Orders] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch orders'),
      { status: 500 },
    );
  }
}

