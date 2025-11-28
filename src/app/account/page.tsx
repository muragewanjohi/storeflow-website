/**
 * Customer Account Dashboard
 * 
 * Overview page showing customer stats, recent orders, and quick actions
 */

import { requireTenant } from '@/lib/tenant-context/server';
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';
import { prisma } from '@/lib/prisma/client';
import { linkGuestOrdersToCustomer } from '@/lib/orders/link-guest-orders';
import AccountDashboardClient from './account-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function AccountDashboardPage() {
  const tenant = await requireTenant();
  const customer = await getCurrentCustomer();

  if (!customer) {
    return null; // Layout will handle the error
  }

  // Automatically link guest orders when viewing the dashboard
  // This ensures orders are linked even if the async call during login/registration failed
  try {
    await linkGuestOrdersToCustomer(customer.id, customer.email, tenant.id);
  } catch (error) {
    // Silently fail - we'll show a button to manually link if needed
    console.error('Error auto-linking guest orders:', error);
  }

  // Fetch recent orders - include both orders linked to customer ID and guest orders by email
  const recentOrders = await prisma.orders.findMany({
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
    select: {
      id: true,
      order_number: true,
      total_amount: true,
      status: true,
      payment_status: true,
      created_at: true,
    },
    orderBy: {
      created_at: 'desc',
    },
    take: 5,
  });

  // Get order statistics - include both linked and guest orders by email
  const orderStats = await prisma.orders.aggregate({
    where: {
      tenant_id: tenant.id,
      OR: [
        { user_id: customer.id }, // Orders linked to customer account
        { 
          user_id: null, // Guest orders
          email: {
            equals: customer.email,
            mode: 'insensitive',
          },
        },
      ],
    },
    _count: {
      id: true,
    },
    _sum: {
      total_amount: true,
    },
  });

  const totalOrders = orderStats._count.id || 0;
  const totalSpent = Number(orderStats._sum.total_amount || 0);

  // Get pending orders count - include both linked and guest orders by email
  const pendingOrders = await prisma.orders.count({
    where: {
      tenant_id: tenant.id,
      OR: [
        { user_id: customer.id }, // Orders linked to customer account
        { 
          user_id: null, // Guest orders
          email: {
            equals: customer.email,
            mode: 'insensitive',
          },
        },
      ],
      status: {
        in: ['pending', 'processing'],
      },
    },
  });

  const dashboardData = {
    customer: {
      name: customer.name,
      email: customer.email,
      joinedDate: customer.created_at,
    },
    stats: {
      totalOrders,
      totalSpent,
      pendingOrders,
    },
    recentOrders: recentOrders.map((order: typeof recentOrders[0]) => ({
      ...order,
      total_amount: Number(order.total_amount),
    })),
  };

  return <AccountDashboardClient data={dashboardData} />;
}

