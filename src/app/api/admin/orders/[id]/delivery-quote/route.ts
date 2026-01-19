/**
 * Delivery Quote Management API (Admin)
 * 
 * PUT: Update order with delivery fee quote
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';
import { sendDeliveryFeeQuoteEmail } from '@/lib/orders/emails';

const deliveryQuoteSchema = z.object({
  delivery_fee_quote: z.number().min(0, 'Delivery fee must be positive'),
  delivery_fee_notes: z.string().optional().nullable(),
});

/**
 * PUT /api/admin/orders/[id]/delivery-quote - Update order with delivery fee quote
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
    const validatedData = deliveryQuoteSchema.parse(body);

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

    // Calculate new total with delivery fee
    const currentTotal = Number(order.total_amount);
    const deliveryFee = validatedData.delivery_fee_quote;
    const newTotal = currentTotal + deliveryFee;

    // Update order with delivery quote
    const updated = await prisma.orders.update({
      where: { id },
      data: {
        delivery_fee_quote: deliveryFee,
        delivery_fee_notes: validatedData.delivery_fee_notes || null,
        delivery_fee_status: 'quoted',
        total_amount: newTotal,
        updated_at: new Date(),
      },
      include: {
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

    // Send notification email to customer about the quote
    sendDeliveryFeeQuoteEmail({
      order: updated as any,
      tenant,
      deliveryFeeQuote: deliveryFee,
      notes: validatedData.delivery_fee_notes || null,
    }).catch((error) => {
      console.error('Error sending delivery fee quote email:', error);
      // Don't fail the request if email fails
    });

    return NextResponse.json({
      success: true,
      order: {
        id: updated.id,
        order_number: updated.order_number,
        delivery_fee_quote: Number(updated.delivery_fee_quote),
        delivery_fee_notes: updated.delivery_fee_notes,
        delivery_fee_status: updated.delivery_fee_status,
        total_amount: Number(updated.total_amount),
      },
    });
  } catch (error: any) {
    console.error('Error updating delivery quote:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update delivery quote' },
      { status: error.status || 500 }
    );
  }
}
