/**
 * Order Confirmation Page
 * 
 * Displays order confirmation after successful checkout
 */

import { notFound } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { getOrCreateCustomer } from '@/lib/customers/get-customer';
import OrderConfirmationClient from './order-confirmation-client';
import StorefrontHeader from '@/components/storefront/header';
import StorefrontFooter from '@/components/storefront/footer';

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ order_number?: string; email?: string }>;
}) {
  const tenant = await requireTenant();

  if (!tenant) {
    return <div>Store not found</div>;
  }

  const { id } = await params;
  const { order_number, email } = await searchParams;

  // Try to get authenticated user (optional for guest orders)
  const user = await getUser();
  let customerId: string | null = null;

  if (user) {
    // Authenticated user - use customer ID
    customerId = await getOrCreateCustomer(user, tenant.id);
  }

  // Build where clause - allow access via:
  // 1. Authenticated user (user_id matches)
  // 2. Guest order (order_number + email match)
  const whereClause: any = {
    id,
    tenant_id: tenant.id,
  };

  if (customerId) {
    // Authenticated user - can access their own orders
    whereClause.user_id = customerId;
  } else if (order_number && email) {
    // Guest order - verify with order number and email
    whereClause.order_number = order_number;
    whereClause.email = {
      equals: email,
      mode: 'insensitive',
    };
  } else {
    // No authentication and no order_number/email - deny access
    notFound();
  }

  // Fetch order
  const order = await prisma.orders.findFirst({
    where: whereClause,
    select: {
      id: true,
      order_number: true,
      total_amount: true,
      status: true,
      payment_status: true,
      payment_gateway: true,
      shipping_address: true,
      billing_address: true,
      order_details: true, // Contains tracking info
      created_at: true,
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
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Convert Decimal to number and ensure order_details is included
  const orderData = {
    ...order,
    total_amount: Number(order.total_amount),
    order_details: order.order_details || {},
    order_products: order.order_products.map((op: any) => ({
      ...op,
      price: Number(op.price),
      total: Number(op.total),
    })),
  };

  // Check if this is a fresh order confirmation (within last 5 minutes)
  // Only show confirmation message for fresh orders
  const isFreshOrder = order.created_at && 
    (Date.now() - new Date(order.created_at).getTime()) < 5 * 60 * 1000; // 5 minutes

  // Check if accessed via track order (has email param) or from orders list
  const isFromTrackOrder = !!email;
  const showConfirmation = isFreshOrder && !isFromTrackOrder;

  return (
    <div className="min-h-screen flex flex-col">
      <StorefrontHeader />
      <main className="flex-1">
        <OrderConfirmationClient 
          order={orderData} 
          isAuthenticated={!!user}
          showConfirmation={showConfirmation ?? false}
        />
      </main>
      <StorefrontFooter />
    </div>
  );
}

