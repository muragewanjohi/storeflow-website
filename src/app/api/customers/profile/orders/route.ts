/**
 * Customer Order History API Route
 * 
 * GET: Get customer's order history
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

/**
 * GET /api/customers/profile/orders - Get customer's order history
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);
    
    // TODO: Get customer from session
    // For now, we'll accept customer_id as query param for testing
    const customerId = searchParams.get('customer_id');
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID required' },
        { status: 400 }
      );
    }

    // Verify customer exists and belongs to tenant
    const customer = await prisma.customers.findFirst({
      where: {
        id: customerId,
        tenant_id: tenant.id,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get orders for this customer (by email)
    const orders = await prisma.orders.findMany({
      where: {
        tenant_id: tenant.id,
        email: customer.email,
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
    });

    return NextResponse.json({
      success: true,
      orders: orders.map((order) => ({
        id: order.id,
        order_number: order.order_number,
        total_amount: Number(order.total_amount),
        status: order.status,
        payment_status: order.payment_status,
        item_count: order.order_products.reduce((sum, item) => sum + item.quantity, 0),
        items: order.order_products.map((item) => ({
          id: item.id,
          product_name: item.products?.name || 'Unknown Product',
          product_image: item.products?.image,
          quantity: item.quantity,
          price: Number(item.price),
          total: Number(item.total),
        })),
        created_at: order.created_at,
        updated_at: order.updated_at,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching customer orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: error.status || 500 }
    );
  }
}

