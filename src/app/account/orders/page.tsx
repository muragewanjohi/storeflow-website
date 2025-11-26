/**
 * Account Orders Page
 * 
 * Displays list of all orders for the authenticated customer
 * This page is within the account layout, so it has the sidebar navigation
 */

import { requireTenant } from '@/lib/tenant-context/server';
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';
import { prisma } from '@/lib/prisma/client';
import OrdersListClient from './orders-list-client';

export default async function AccountOrdersPage() {
  const tenant = await requireTenant();
  const customer = await getCurrentCustomer();

  if (!customer) {
    return null; // Layout will handle the error
  }

  // Fetch orders - include both orders linked to customer ID and guest orders by email
  const orders = await prisma.orders.findMany({
    where: {
      tenant_id: tenant.id,
      OR: [
        { user_id: customer.id }, // Orders linked to customer account
        { 
          user_id: null, // Guest orders
          email: {
            equals: customer.email,
            mode: 'insensitive', // Case-insensitive email matching
          },
        },
      ],
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

  return <OrdersListClient initialOrders={ordersData} />;
}
