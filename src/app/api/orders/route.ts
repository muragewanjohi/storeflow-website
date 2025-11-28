/**
 * Orders API Routes
 * 
 * GET: List orders
 * POST: Create order (alternative to checkout)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { orderQuerySchema } from '@/lib/orders/validation';

/**
 * GET /api/orders - List orders
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);
    
    // Convert null to undefined for optional fields (searchParams.get returns null if not present)
    const getParam = (key: string) => {
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

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenant_id: tenant.id,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.payment_status) {
      where.payment_status = query.payment_status;
    }

    if (query.order_number) {
      where.order_number = {
        contains: query.order_number,
        mode: 'insensitive',
      };
    }

    if (query.customer_email) {
      where.email = {
        contains: query.customer_email,
        mode: 'insensitive',
      };
    }

    if (query.search) {
      where.OR = [
        { order_number: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
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

    // Build orderBy
    const orderBy: any = {};
    orderBy[query.sort_by || 'created_at'] = query.sort_order || 'desc';

    // Fetch orders
    const [orders, total] = await Promise.all([
      prisma.orders.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          order_products: {
            include: {
              products: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      }),
      prisma.orders.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      orders: orders.map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        name: order.name,
        email: order.email,
        phone: order.phone,
        total_amount: Number(order.total_amount),
        status: order.status,
        payment_status: order.payment_status,
        payment_gateway: order.payment_gateway,
        item_count: order.order_products.reduce((sum: any, item: any) => sum + item.quantity, 0),
        created_at: order.created_at,
        updated_at: order.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: error.status || 500 }
    );
  }
}

