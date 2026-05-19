/**
 * GET /api/orders/[id]/tumizi/sync-payment
 *
 * Polls Tumizi for the latest customer payment status and updates the order.
 * Used by storefront order confirmation and dashboard "Refresh" actions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { getOrCreateCustomer } from '@/lib/customers/get-customer';
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';
import { syncTumiziOrderPaymentByOrderId } from '@/lib/tumizi/sync-order-payment';

export const dynamic = 'force-dynamic';

async function customerCanAccessOrder(params: {
  order: {
    id: string;
    order_number: string;
    user_id: string | null;
    created_at: Date | null;
    shipping_address: unknown;
  };
  customerId: string | null;
  orderNumber?: string | null;
  email?: string | null;
}): Promise<boolean> {
  const { order, customerId, orderNumber, email } = params;
  const orderAge = order.created_at ? Date.now() - new Date(order.created_at).getTime() : Infinity;
  const isFreshOrder = orderAge < 10 * 60 * 1000;

  if (customerId) {
    return order.user_id === customerId || isFreshOrder;
  }

  if (email) {
    const shippingEmail =
      order.shipping_address &&
      typeof order.shipping_address === 'object' &&
      order.shipping_address !== null &&
      'email' in order.shipping_address
        ? String((order.shipping_address as { email?: string }).email || '')
        : '';
    return shippingEmail.toLowerCase() === email.toLowerCase();
  }

  if (orderNumber) {
    return order.order_number === orderNumber || isFreshOrder;
  }

  return isFreshOrder;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await requireTenant();
    const { id: orderId } = await params;
    const { searchParams } = request.nextUrl;
    const orderNumber = searchParams.get('order_number');
    const email = searchParams.get('email');

    const order = await prisma.orders.findFirst({
      where: { id: orderId, tenant_id: tenant.id },
      select: {
        id: true,
        order_number: true,
        user_id: true,
        created_at: true,
        shipping_address: true,
        payment_gateway: true,
        payment_status: true,
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (order.payment_gateway !== 'tumizi') {
      return NextResponse.json(
        { success: false, error: 'Order is not a Tumizi payment' },
        { status: 400 },
      );
    }

    let authorized = false;

    try {
      const user = await getUser();
      if (user && (user.role === 'landlord' || user.tenant_id === tenant.id)) {
        requireAnyRole(user, ['tenant_admin', 'tenant_staff', 'landlord']);
        authorized = true;
      }
    } catch {
      // not a dashboard user
    }

    if (!authorized) {
      const user = await getUser();
      let customerId: string | null = null;
      if (user) {
        customerId = await getOrCreateCustomer(user, tenant.id);
      } else {
        const customer = await getCurrentCustomer();
        if (customer) {
          customerId = customer.id;
        }
      }

      authorized = await customerCanAccessOrder({
        order,
        customerId,
        orderNumber,
        email,
      });
    }

    if (!authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const result = await syncTumiziOrderPaymentByOrderId(orderId, tenant.id);

    return NextResponse.json({
      success: true,
      synced: result.synced,
      payment_status: result.payment_status ?? order.payment_status,
      tumizi_status: result.tumizi_status,
      reason: result.reason,
    });
  } catch (error) {
    console.error('[Tumizi sync-payment]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync Tumizi payment status' },
      { status: 500 },
    );
  }
}
