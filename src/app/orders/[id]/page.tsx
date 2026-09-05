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

  // Build where clause - fetch order by ID and tenant_id
  // Access verification happens after fetching (more flexible for fresh orders)
  const whereClause: any = {
    id,
    tenant_id: tenant.id,
  };

  // Fetch order with product details for reviews
  const order = await prisma.orders.findFirst({
    where: whereClause,
    select: {
      id: true,
      order_number: true,
      user_id: true, // Include user_id for access verification
      total_amount: true,
      status: true,
      payment_status: true,
      payment_gateway: true,
      shipping_address: true,
      billing_address: true,
      order_details: true, // Contains tracking info
      created_at: true,
      delivery_fee: true,
      delivery_fee_status: true,
      delivery_fee_quote: true,
      delivery_fee_notes: true,
      delivery_zone_name: true,
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

  // Verify access permissions
  const orderAge = order.created_at 
    ? Date.now() - new Date(order.created_at).getTime()
    : Infinity;
  const isFreshOrder = orderAge < 10 * 60 * 1000; // 10 minutes

  // Check if user has access to this order
  let hasAccess = false;

  if (customerId) {
    // Authenticated user - check if user_id matches
    // Also allow if order is fresh (handles case where customerId lookup might differ)
    hasAccess = order.user_id === customerId || isFreshOrder;
  } else if (email) {
    // Guest order with email - verify email matches shipping_address
    const shippingEmail = order.shipping_address && typeof order.shipping_address === 'object' && 'email' in order.shipping_address
      ? (order.shipping_address as any).email
      : null;
    
    hasAccess = shippingEmail && shippingEmail.toLowerCase() === email.toLowerCase();
  } else if (order_number) {
    // Guest order with order_number - allow if order_number matches
    // Also allow if order is fresh (for immediate redirect after checkout)
    hasAccess = order.order_number === order_number || isFreshOrder;
  } else {
    // No authentication, no email, no order_number - only allow if order is fresh
    hasAccess = isFreshOrder;
  }

  if (!hasAccess) {
    notFound();
  }

  // Convert Decimal to number and ensure order_details is included
  const orderData = {
    ...order,
    total_amount: Number(order.total_amount),
    delivery_fee: order.delivery_fee ? Number(order.delivery_fee) : null,
    delivery_fee_quote: order.delivery_fee_quote ? Number(order.delivery_fee_quote) : null,
    order_details: order.order_details || {},
    order_products: order.order_products.map((op: any) => ({
      ...op,
      price: Number(op.price),
      total: Number(op.total),
    })),
  };

  // Check if this is a fresh order confirmation (within last 5 minutes)
  // Only show confirmation message for fresh orders
  const isFreshOrderForConfirmation = order.created_at && 
    (Date.now() - new Date(order.created_at).getTime()) < 5 * 60 * 1000; // 5 minutes

  // Check if accessed via track order (has email param) or from orders list
  const isFromTrackOrder = !!email;
  const showConfirmation = isFreshOrderForConfirmation && !isFromTrackOrder;

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

