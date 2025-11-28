/**
 * Customers Management Page
 * 
 * Lists all customers for the tenant with filtering and search
 * Only accessible to tenant_admin and tenant_staff
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import CustomersListClient from './customers-list-client';

export const dynamic = 'force-dynamic';

export default async function CustomersPage({
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
  const email = typeof params.email === 'string' ? params.email : undefined;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {
    tenant_id: tenant.id,
  };

  if (email) {
    where.email = {
      contains: email,
      mode: 'insensitive' as const,
    };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { email: { contains: search, mode: 'insensitive' as const } },
      { username: { contains: search, mode: 'insensitive' as const } },
    ];
  }

  let customers: any[] = [];
  let pagination: any = null;
  let dbError: string | null = null;

  try {
    // Fetch customers directly from database
    const [customersData, total] = await Promise.all([
      prisma.customers.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc',
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          mobile: true,
          company: true,
          email_verified: true,
          image: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              cart_items: true,
              product_reviews: true,
              product_wishlists: true,
              support_tickets: true,
            },
          },
        },
      }),
      prisma.customers.count({ where }),
    ]);

    // Get order counts and total spent for each customer
    const customersWithStats = await Promise.all(
      customersData.map(async (customer) => {
        const [orderCount, paidOrders] = await Promise.all([
          prisma.orders.count({
            where: {
              tenant_id: tenant.id,
              email: customer.email,
            },
          }),
          prisma.orders.findMany({
            where: {
              tenant_id: tenant.id,
              email: customer.email,
              payment_status: 'paid',
            },
            select: {
              total_amount: true,
            },
          }),
        ]);

        const totalSpent = paidOrders.reduce(
          (sum: any, order: any) => sum + Number(order.total_amount),
          0
        );

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          username: customer.username,
          mobile: customer.mobile,
          company: customer.company,
          email_verified: customer.email_verified,
          image: customer.image,
          stats: {
            orders: orderCount,
            total_spent: totalSpent,
            cart_items: customer._count.cart_items,
            reviews: customer._count.product_reviews,
            wishlist_items: customer._count.product_wishlists,
            support_tickets: customer._count.support_tickets,
          },
          created_at: customer.created_at?.toISOString() || '',
          updated_at: customer.updated_at?.toISOString() || '',
        };
      })
    );

    customers = customersWithStats;

    pagination = {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Error fetching customers:', error);
    dbError = 'Failed to load customers. Please try again later.';
  }

  return (
    <CustomersListClient
      initialCustomers={customers}
      initialPagination={pagination}
      dbError={dbError}
      currentSearchParams={{
        page,
        limit,
        search: search || '',
        email: email || '',
      }}
    />
  );
}

