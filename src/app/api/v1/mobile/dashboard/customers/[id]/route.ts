import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantAdmin,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import {
  CustomerAdminError,
  deleteCustomerForTenant,
  updateCustomerForTenant,
} from '@/lib/customers/admin-operations';
import { customerUpdateSchema } from '@/lib/customers/validation';

function parseCustomerUpdateBody(body: unknown) {
  const raw = (body ?? {}) as Record<string, unknown>;
  return customerUpdateSchema.parse({
    name: raw.name,
    username: raw.username,
    mobile: raw.mobile,
    company: raw.company,
    address: raw.address,
    city: raw.city,
    state: raw.state,
    country: raw.country,
    postal_code: raw.postal_code ?? raw.postalCode,
    image: raw.image,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const customer = await prisma.customers.findFirst({
      where: { id, tenant_id: tenantId },
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
      return NextResponse.json(mobileError('NOT_FOUND', 'Customer not found'), { status: 404 });
    }

    const orderCount = await prisma.orders.count({
      where: { tenant_id: tenantId, email: customer.email },
    });

    const paidOrders = await prisma.orders.findMany({
      where: { tenant_id: tenantId, email: customer.email, payment_status: 'paid' },
      select: { total_amount: true },
    });

    const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

    return NextResponse.json(
      mobileSuccess({
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
      }),
      { status: 200 },
    );
  } catch (e) {
    console.error('[Mobile customer GET]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch customer'), { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  const { id } = await params;

  try {
    const customer = await updateCustomerForTenant(
      gate.ctx.tenantId,
      id,
      parseCustomerUpdateBody(await request.json()),
    );

    return NextResponse.json(mobileSuccess({ customer }), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid payload',
          error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        ),
        { status: 400 },
      );
    }
    if (error instanceof CustomerAdminError) {
      return NextResponse.json(mobileError('NOT_FOUND', error.message), { status: error.status });
    }
    console.error('[Mobile customer PUT]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update customer'), { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return PUT(request, context);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantAdmin(request);
  if (!gate.ok) return gate.response;

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  const { id } = await params;

  try {
    await deleteCustomerForTenant(gate.ctx.tenantId, id);
    return NextResponse.json(mobileSuccess({ deleted: true }), { status: 200 });
  } catch (error) {
    if (error instanceof CustomerAdminError) {
      return NextResponse.json(mobileError('NOT_FOUND', error.message), { status: error.status });
    }
    console.error('[Mobile customer DELETE]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete customer'), { status: 500 });
  }
}
