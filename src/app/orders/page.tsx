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
import StorefrontHeader from '@/components/storefront/header';
import StorefrontFooter from '@/components/storefront/footer';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const tenant = await requireTenant();

  if (!tenant) {
    return <div>Store not found</div>;
  }

  // Require authentication to view orders list
  const user = await requireAuthOrRedirect('/login?redirect=/orders');

  // Get customer ID
  const customerId = await getOrCreateCustomer(user, tenant.id);

  // Fetch orders for this customer
  const orders = await prisma.orders.findMany({
    where: {
      tenant_id: tenant.id,
      user_id: customerId,
    },
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
    take: 50, // Limit to 50 most recent orders
  });

  // Convert Decimal to number
  const ordersData = orders.map((order) => ({
    ...order,
    total_amount: Number(order.total_amount),
    order_products: order.order_products.map((op) => ({
      ...op,
      price: Number(op.price),
      total: Number(op.total),
    })),
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <StorefrontHeader />
      <main className="flex-1">
        <OrdersListClient initialOrders={ordersData} />
      </main>
      <StorefrontFooter />
    </div>
  );
}

