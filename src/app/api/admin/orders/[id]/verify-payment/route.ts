/**
 * Payment Verification API Route
 * 
 * POST: Verify or reject customer-submitted payment verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const verifyPaymentSchema = z.object({
  action: z.enum(['verify', 'reject']),
});

/**
 * POST /api/admin/orders/[id]/verify-payment - Verify or reject payment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication and tenant_admin or tenant_staff role
    const user = await requireAuthOrRedirect('/login');
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

    // Get tenant context
    const tenant = await requireTenant();

    // Verify user belongs to tenant (unless landlord)
    if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = verifyPaymentSchema.parse(body);

    // Fetch order
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

    // Check if order has payment verification details
    if (!order.payment_meta || typeof order.payment_meta !== 'object') {
      return NextResponse.json(
        { error: 'No payment verification details found for this order' },
        { status: 400 }
      );
    }

    const paymentMeta = order.payment_meta as any;

    if (action === 'verify') {
      // Verify payment
      const updatedOrder = await prisma.orders.update({
        where: { id },
        data: {
          payment_status: 'paid',
          payment_meta: {
            ...paymentMeta,
            verification_status: 'verified',
            verified_at: new Date().toISOString(),
            verified_by: user.email,
          },
        },
      });

      return NextResponse.json({
        success: true,
        order: {
          payment_status: updatedOrder.payment_status,
          payment_meta: updatedOrder.payment_meta,
        },
      });
    } else {
      // Reject payment
      const updatedOrder = await prisma.orders.update({
        where: { id },
        data: {
          payment_status: 'pending',
          payment_meta: {
            ...paymentMeta,
            verification_status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejected_by: user.email,
          },
        },
      });

      return NextResponse.json({
        success: true,
        order: {
          payment_status: updatedOrder.payment_status,
          payment_meta: updatedOrder.payment_meta,
        },
      });
    }
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
