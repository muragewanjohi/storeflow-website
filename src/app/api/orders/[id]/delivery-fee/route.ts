/**
 * Delivery Fee Approval API (Customer)
 * 
 * PUT: Customer approves or rejects delivery fee quote
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';
import { z } from 'zod';

const deliveryFeeActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional().nullable(),
});

/**
 * PUT /api/orders/[id]/delivery-fee - Approve or reject delivery fee quote
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenant();
    const { id } = await params;
    const body = await request.json();
    const validatedData = deliveryFeeActionSchema.parse(body);

    // Get customer (optional - guest orders can also approve via email)
    const customer = await getCurrentCustomer();

    // Verify order exists and belongs to tenant
    const order = await prisma.orders.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify order needs approval (status should be 'quoted')
    if (order.delivery_fee_status !== 'quoted') {
      return NextResponse.json(
        { error: 'Order does not have a pending delivery fee quote' },
        { status: 400 }
      );
    }

    // Verify customer matches (if authenticated)
    if (customer) {
      if (order.user_id && order.user_id !== customer.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
    } else {
      // For guest orders, verify email matches
      const emailFromRequest = body.email;
      if (emailFromRequest && order.email !== emailFromRequest) {
        return NextResponse.json(
          { error: 'Email does not match order' },
          { status: 403 }
        );
      }
    }

    if (validatedData.action === 'approve') {
      // Approve delivery fee
      const deliveryFee = Number(order.delivery_fee_quote || 0);
      const currentTotal = Number(order.total_amount);
      const newTotal = currentTotal; // Total already includes the quote

      const updated = await prisma.orders.update({
        where: { id },
        data: {
          delivery_fee: deliveryFee,
          delivery_fee_status: 'approved',
          total_amount: newTotal,
          updated_at: new Date(),
        },
      });

      // TODO: Send notification email to store owner about approval

      return NextResponse.json({
        success: true,
        message: 'Delivery fee approved',
        order: {
          id: updated.id,
          order_number: updated.order_number,
          delivery_fee: Number(updated.delivery_fee),
          delivery_fee_status: updated.delivery_fee_status,
          total_amount: Number(updated.total_amount),
        },
      });
    } else {
      // Reject delivery fee
      const updated = await prisma.orders.update({
        where: { id },
        data: {
          delivery_fee_status: 'rejected',
          delivery_fee_notes: validatedData.reason 
            ? `${order.delivery_fee_notes || ''}\n\nCustomer rejection reason: ${validatedData.reason}`.trim()
            : order.delivery_fee_notes,
          updated_at: new Date(),
        },
      });

      // TODO: Send notification email to store owner about rejection

      return NextResponse.json({
        success: true,
        message: 'Delivery fee rejected',
        order: {
          id: updated.id,
          order_number: updated.order_number,
          delivery_fee_status: updated.delivery_fee_status,
        },
      });
    }
  } catch (error: any) {
    console.error('Error processing delivery fee action:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to process delivery fee action' },
      { status: error.status || 500 }
    );
  }
}
