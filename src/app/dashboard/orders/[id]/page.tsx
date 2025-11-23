/**
 * Order Detail Page
 * 
 * Displays order details with status updates and fulfillment options
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import OrderDetailClient from './order-detail-client';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;

  // Fetch order directly from database
  let order: any = null;
  let error: string | null = null;

  try {
    const orderData = await prisma.orders.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      include: {
        order_products: {
          include: {
            products: {
              select: {
                id: true,
                name: true,
                image: true,
                sku: true,
              },
            },
          },
        },
      },
    });

    if (!orderData) {
      error = 'Order not found';
    } else {
      // Fetch product variants separately if needed
      const variantIds = orderData.order_products
        .filter((item) => item.variant_id)
        .map((item) => item.variant_id) as string[];

      const variants = variantIds.length > 0
        ? await prisma.product_variants.findMany({
            where: {
              id: { in: variantIds },
              tenant_id: tenant.id,
            },
            select: {
              id: true,
              sku: true,
            },
          })
        : [];

      const variantMap = new Map(variants.map((v) => [v.id, v]));

      order = {
        id: orderData.id,
        order_number: orderData.order_number,
        name: orderData.name,
        email: orderData.email,
        phone: orderData.phone,
        total_amount: Number(orderData.total_amount),
        status: orderData.status,
        payment_status: orderData.payment_status,
        payment_gateway: orderData.payment_gateway,
        transaction_id: orderData.transaction_id,
        shipping_address: orderData.shipping_address,
        billing_address: orderData.billing_address,
        coupon: orderData.coupon,
        coupon_discounted: orderData.coupon_discounted ? Number(orderData.coupon_discounted) : null,
        message: orderData.message,
        items: orderData.order_products.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          product_name: item.products?.name || 'Unknown Product',
          product_image: item.products?.image,
          product_sku: item.products?.sku,
          variant_sku: item.variant_id ? variantMap.get(item.variant_id)?.sku : null,
          quantity: item.quantity,
          price: Number(item.price),
          total: Number(item.total),
        })),
        created_at: orderData.created_at?.toISOString() || '',
        updated_at: orderData.updated_at?.toISOString() || '',
      };
    }
  } catch (err) {
    console.error('Error fetching order:', err);
    error = 'Failed to load order. Please try again later.';
  }

  if (error && !order) {
    redirect('/dashboard/orders');
  }

  return <OrderDetailClient initialOrder={order} error={error} />;
}

