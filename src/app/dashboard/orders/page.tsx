/**
 * Orders Management Page
 * 
 * Lists all orders for the tenant with filtering and search
 * Only accessible to tenant_admin and tenant_staff
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import OrdersListClient from './orders-list-client';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Require authentication and tenant_admin or tenant_staff role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Parse search params
  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
  const limit = typeof params.limit === 'string' ? parseInt(params.limit, 10) : 20;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const payment_status = typeof params.payment_status === 'string' ? params.payment_status : undefined;
  const order_number = typeof params.order_number === 'string' ? params.order_number : undefined;
  const customer_email = typeof params.customer_email === 'string' ? params.customer_email : undefined;
  const start_date = typeof params.start_date === 'string' ? params.start_date : undefined;
  const end_date = typeof params.end_date === 'string' ? params.end_date : undefined;

  const skip = (page - 1) * limit;

  // Build where clause for direct database query
  const where: any = {
    tenant_id: tenant.id,
  };

  if (status) {
    where.status = status;
  }

  if (payment_status) {
    where.payment_status = payment_status;
  }

  if (order_number) {
    where.order_number = {
      contains: order_number,
      mode: 'insensitive' as const,
    };
  }

  if (customer_email) {
    where.email = {
      contains: customer_email,
      mode: 'insensitive' as const,
    };
  }

  if (search) {
    where.OR = [
      { order_number: { contains: search, mode: 'insensitive' as const } },
      { name: { contains: search, mode: 'insensitive' as const } },
      { email: { contains: search, mode: 'insensitive' as const } },
    ];
  }

  if (start_date || end_date) {
    where.created_at = {};
    if (start_date) {
      where.created_at.gte = new Date(start_date);
    }
    if (end_date) {
      where.created_at.lte = new Date(end_date);
    }
  }

  let orders: any[] = [];
  let pagination: any = null;
  let dbError: string | null = null;

  try {
    // Fetch orders directly from database
    const [ordersData, total] = await Promise.all([
      prisma.orders.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc',
        },
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

    orders = ordersData.map((order) => ({
      id: order.id,
      order_number: order.order_number,
      name: order.name,
      email: order.email,
      phone: order.phone,
      total_amount: Number(order.total_amount),
      status: order.status,
      payment_status: order.payment_status,
      payment_gateway: order.payment_gateway,
      item_count: order.order_products.reduce((sum, item) => sum + item.quantity, 0),
      created_at: order.created_at?.toISOString() || '',
      updated_at: order.updated_at?.toISOString() || '',
    }));

    pagination = {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Error fetching orders:', error);
    dbError = 'Failed to load orders. Please try again later.';
  }

  return (
    <OrdersListClient
      initialOrders={orders}
      initialPagination={pagination}
      dbError={dbError}
      currentSearchParams={{
        page,
        limit,
        search: search || '',
        status: status || '',
        payment_status: payment_status || '',
        order_number: order_number || '',
        customer_email: customer_email || '',
        start_date: start_date || '',
        end_date: end_date || '',
      }}
    />
  );
}

