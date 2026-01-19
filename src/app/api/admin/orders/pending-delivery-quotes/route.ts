/**
 * Pending Delivery Quotes API (Admin)
 * 
 * GET: Get orders that need delivery fee quotes (out-of-zone orders)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';

/**
 * GET /api/admin/orders/pending-delivery-quotes - Get orders needing delivery quotes
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

    const orders = await prisma.orders.findMany({
      where: {
        tenant_id: tenant.id,
        delivery_fee_status: 'pending',
        checkout_type: 'delivery',
      },
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        order_number: true,
        name: true,
        email: true,
        phone: true,
        total_amount: true,
        status: true,
        payment_status: true,
        shipping_address: true,
        delivery_zone_name: true,
        created_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      orders: orders.map(order => ({
        id: order.id,
        order_number: order.order_number,
        customer_name: order.name,
        customer_email: order.email,
        customer_phone: order.phone,
        total_amount: Number(order.total_amount),
        status: order.status,
        payment_status: order.payment_status,
        shipping_address: order.shipping_address,
        delivery_zone_name: order.delivery_zone_name,
        created_at: order.created_at,
      })),
      count: orders.length,
    });
  } catch (error: any) {
    console.error('Error fetching pending delivery quotes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending quotes' },
      { status: error.status || 500 }
    );
  }
}
