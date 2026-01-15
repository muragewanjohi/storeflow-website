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
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';
import OrderConfirmationClient from './order-confirmation-client';
import StorefrontHeader from '@/components/storefront/header-server';
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
  } else {
    // Try customer session (for customer login)
    const customer = await getCurrentCustomer();
    if (customer) {
      customerId = customer.id;
    }
  }

  // Build where clause - allow access via:
  // 1. Authenticated user/customer (user_id matches)
  // 2. Guest order (order_number + email match from shipping_address)
  // 3. Order ID + order_number (for immediate redirect after checkout)
  const whereClause: any = {
    id,
    tenant_id: tenant.id,
  };

  if (customerId) {
    // Authenticated user/customer - can access their own orders
    whereClause.user_id = customerId;
  } else if (order_number) {
    // For guest orders, verify with order_number
    // We'll verify email from shipping_address after fetching
    whereClause.order_number = order_number;
  } else {
    // No authentication and no order_number - deny access
    notFound();
  }

  // Fetch order with product details for reviews
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

  // For guest orders, verify email matches shipping_address email if provided
  if (!customerId && email) {
    const shippingEmail = order.shipping_address && typeof order.shipping_address === 'object' && 'email' in order.shipping_address
      ? (order.shipping_address as any).email
      : null;
    
    if (shippingEmail && shippingEmail.toLowerCase() !== email.toLowerCase()) {
      // Email doesn't match - deny access
      notFound();
    }
  }

  // For guest orders without email param, allow access if order is fresh (within 10 minutes)
  // This handles immediate redirect after checkout
  if (!customerId && !email) {
    const orderAge = order.created_at 
      ? Date.now() - new Date(order.created_at).getTime()
      : Infinity;
    const isFreshOrder = orderAge < 10 * 60 * 1000; // 10 minutes
    
    if (!isFreshOrder) {
      // Order is not fresh and no email provided - deny access
      notFound();
    }
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

  // Determine if user is authenticated (either admin user or customer session)
  const isAuthenticated = !!user || !!customerId;

  return (
    <div className="min-h-screen flex flex-col">
      <StorefrontHeader />
      <main className="flex-1">
        <OrderConfirmationClient 
          order={orderData} 
          isAuthenticated={isAuthenticated}
          showConfirmation={showConfirmation ?? false}
        />
      </main>
      <StorefrontFooter />
    </div>
  );
}

