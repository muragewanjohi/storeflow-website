/**
 * Customer Orders Page
 * 
 * Displays list of all orders for the authenticated customer
 */

import { requireAuthOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { getOrCreateCustomer } from '@/lib/customers/get-customer';
import OrdersListClient from './orders-list-client';
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';

export const dynamic = 'force-dynamic';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const tenant = await requireTenant();

  if (!tenant) {
    return <div>Store not found</div>;
  }

  // Require authentication to view orders list
  const user = await requireAuthOrRedirect('/login?redirect=/orders');

  // Get customer ID
  const customerId = await getOrCreateCustomer(user, tenant.id);

  // Parse search params
  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
  const limit = typeof params.limit === 'string' ? parseInt(params.limit, 10) : 10;
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    tenant_id: tenant.id,
    user_id: customerId,
  };

  let orders: any[] = [];
  let pagination: any = null;

  try {
    // Fetch orders and total count
    const [ordersData, total] = await Promise.all([
      prisma.orders.findMany({
        where,
        include: {
          order_products: {
            include: {
              products: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  slug: true,
                },
              },
            },
            take: 3, // Show first 3 items per order
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.orders.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    pagination = {
      page,
      limit,
      total,
      totalPages,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
    };

    // Convert Decimal to number
    orders = ordersData.map((order: any) => ({
      ...order,
      total_amount: Number(order.total_amount),
      order_products: order.order_products.map((op: any) => ({
        ...op,
        price: Number(op.price),
        total: Number(op.total),
      })),
    }));
  } catch (error) {
    console.error('Error fetching orders:', error);
    orders = [];
    pagination = null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <StorefrontHeader />
      <main className="flex-1">
        <OrdersListClient initialOrders={orders} initialPagination={pagination} />
      </main>
      <StorefrontFooter />
    </div>
  );
}

