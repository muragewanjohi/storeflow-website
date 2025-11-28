/**
 * Customer Detail API Routes
 * 
 * GET: Get customer details
 * PUT: Update customer
 * DELETE: Delete customer (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { customerUpdateSchema } from '@/lib/customers/validation';

/**
 * GET /api/customers/[id] - Get customer details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
    const { id } = await params;

    const customer = await prisma.customers.findFirst({
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

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get order count
    const orderCount = await prisma.orders.count({
      where: {
        tenant_id: tenant.id,
        email: customer.email,
      },
    });

    // Get total spent
    const orders = await prisma.orders.findMany({
      where: {
        tenant_id: tenant.id,
        email: customer.email,
        payment_status: 'paid',
      },
      select: {
        total_amount: true,
      },
    });

    const totalSpent = orders.reduce((sum: number, order: typeof orders[0]) => sum + Number(order.total_amount), 0);

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        username: customer.username,
        mobile: customer.mobile,
        company: customer.company,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        country: customer.country,
        postal_code: customer.postal_code,
        image: customer.image,
        email_verified: customer.email_verified,
        stats: {
          orders: orderCount,
          total_spent: totalSpent,
          cart_items: customer._count.cart_items,
          reviews: customer._count.product_reviews,
          wishlist_items: customer._count.product_wishlists,
          support_tickets: customer._count.support_tickets,
          saved_addresses: customer._count.user_delivery_addresses,
        },
        created_at: customer.created_at,
        updated_at: customer.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customer' },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/customers/[id] - Update customer
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
    const { id } = await params;
    const body = await request.json();

    const validatedData = customerUpdateSchema.parse(body);

    // Check if customer exists
    const existingCustomer = await prisma.customers.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Update customer (email is not updatable via this endpoint)
    const customer = await prisma.customers.update({
      where: { id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        mobile: true,
        company: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postal_code: true,
        image: true,
        email_verified: true,
        updated_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error: any) {
    console.error('Error updating customer:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update customer' },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/customers/[id] - Delete customer
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin'], '/login'); // Only admins can delete
    
    const { id } = await params;

    // Check if customer exists
    const customer = await prisma.customers.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Delete customer (cascade will handle related records)
    await prisma.customers.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete customer' },
      { status: error.status || 500 }
    );
  }
}

