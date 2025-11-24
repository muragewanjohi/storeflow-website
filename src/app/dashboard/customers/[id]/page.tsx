/**
 * Customer Detail Page
 * 
 * Shows detailed information about a customer
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import CustomerDetailClient from './customer-detail-client';

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  const { id } = await params;

  // Fetch customer with all related data
  let customer: any = null;
  let error: string | null = null;

  try {
    const customerData = await prisma.customers.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      include: {
        _count: {
          select: {
            cart_items: true,
            product_reviews: true,
            product_wishlists: true,
            support_tickets: true,
            user_delivery_addresses: true,
          },
        },
      },
    });

    if (!customerData) {
      error = 'Customer not found';
    } else {
      // Get order statistics
      const [orderCount, paidOrders, recentOrders] = await Promise.all([
        prisma.orders.count({
          where: {
            tenant_id: tenant.id,
            email: customerData.email,
          },
        }),
        prisma.orders.findMany({
          where: {
            tenant_id: tenant.id,
            email: customerData.email,
            payment_status: 'paid',
          },
          select: {
            total_amount: true,
          },
        }),
        prisma.orders.findMany({
          where: {
            tenant_id: tenant.id,
            email: customerData.email,
          },
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
          orderBy: {
            created_at: 'desc',
          },
          take: 10,
        }),
      ]);

      const totalSpent = paidOrders.reduce(
        (sum, order) => sum + Number(order.total_amount),
        0
      );

      // Get addresses
      const addresses = await prisma.user_delivery_addresses.findMany({
        where: {
          user_id: id,
          tenant_id: tenant.id,
        },
        orderBy: [
          { is_default: 'desc' },
          { created_at: 'desc' },
        ],
      });

      // Get reviews
      const reviews = await prisma.product_reviews.findMany({
        where: {
          user_id: id,
          tenant_id: tenant.id,
        },
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
        orderBy: {
          created_at: 'desc',
        },
        take: 10,
      });

      customer = {
        id: customerData.id,
        name: customerData.name,
        email: customerData.email,
        username: customerData.username,
        mobile: customerData.mobile,
        company: customerData.company,
        address: customerData.address,
        city: customerData.city,
        state: customerData.state,
        country: customerData.country,
        postal_code: customerData.postal_code,
        image: customerData.image,
        email_verified: customerData.email_verified,
        stats: {
          orders: orderCount,
          total_spent: totalSpent,
          cart_items: customerData._count.cart_items,
          reviews: customerData._count.product_reviews,
          wishlist_items: customerData._count.product_wishlists,
          support_tickets: customerData._count.support_tickets,
          saved_addresses: customerData._count.user_delivery_addresses,
        },
        recent_orders: recentOrders.map((order) => ({
          id: order.id,
          order_number: order.order_number,
          total_amount: Number(order.total_amount),
          status: order.status,
          payment_status: order.payment_status,
          item_count: order.order_products.reduce((sum, item) => sum + item.quantity, 0),
          created_at: order.created_at?.toISOString() || '',
        })),
        addresses: addresses.map((addr) => ({
          id: addr.id,
          name: addr.name,
          email: addr.email,
          phone: addr.phone,
          address: addr.address,
          city: addr.city,
          state_id: addr.state_id,
          country_id: addr.country_id,
          postal_code: addr.postal_code,
          is_default: addr.is_default,
          created_at: addr.created_at?.toISOString() || '',
        })),
        reviews: reviews.map((review) => ({
          id: review.id,
          product: {
            id: review.products.id,
            name: review.products.name,
            image: review.products.image,
            slug: review.products.slug,
          },
          rating: review.rating,
          comment: review.comment,
          status: review.status,
          created_at: review.created_at?.toISOString() || '',
        })),
        created_at: customerData.created_at?.toISOString() || '',
        updated_at: customerData.updated_at?.toISOString() || '',
      };
    }
  } catch (err) {
    console.error('Error fetching customer:', err);
    error = 'Failed to load customer details';
  }

  return <CustomerDetailClient customer={customer} error={error} />;
}

