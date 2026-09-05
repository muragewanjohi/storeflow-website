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
// Despite the "Tumizi" name this is a plain amount-vs-balance comparison
// with no Tumizi-specific behavior inside it — reused as-is here (basic
// deposit support, docs/SERVICES_PLAN.md, S-Dep.8) rather than forking a
// second copy of the same logic for manual/cash verification.
import { resolveTumiziOrderPaymentStatus } from '@/lib/tumizi/apply-payment-status';

export const dynamic = 'force-dynamic';

const verifyPaymentSchema = z.object({
  action: z.enum(['verify', 'reject']),
  // Basic deposit support (docs/SERVICES_PLAN.md, S-Dep.8) — the amount
  // the tenant admin/staff is personally confirming they received (e.g.
  // read off an M-Pesa till SMS, or counted in cash). Never trusted from
  // the customer's own submitted payment_meta — this route only ever
  // reads it from the verifying admin/staff's own action, the same trust
  // boundary this route already relied on for the plain 'paid' flip.
  // Optional: omitting it preserves the pre-deposit default (assume the
  // full amount currently owed was received), so nothing changes for the
  // common non-deposit order.
  verifiedAmount: z.coerce.number().positive().optional(),
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
    const { action, verifiedAmount } = verifyPaymentSchema.parse(body);

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
      // Basic deposit support (docs/SERVICES_PLAN.md, S-Dep.8) — resolve
      // 'paid' vs 'deposit_paid' from the real amount the admin/staff is
      // confirming, the same way the Tumizi webhook path already does for
      // an automated payment. Defaulting to what was actually owed
      // (deposit_amount if one was ever configured, else the full total)
      // when no verifiedAmount is given preserves today's behavior for
      // every normal, non-deposit order.
      const amountConfirmed = verifiedAmount ?? Number(order.deposit_amount ?? order.total_amount);
      const resolvedStatus = resolveTumiziOrderPaymentStatus(
        'paid',
        { deposit_amount: order.deposit_amount, balance_amount: order.balance_amount },
        amountConfirmed,
      );

      const updatedOrder = await prisma.orders.update({
        where: { id },
        data: {
          payment_status: resolvedStatus,
          payment_meta: {
            ...paymentMeta,
            verification_status: 'verified',
            verified_at: new Date().toISOString(),
            verified_by: user.email,
            verified_amount: amountConfirmed,
          },
        },
      });

      // Real scheduling/booking (S2, docs/SERVICES_PLAN.md) — same
      // promotion the Tumizi webhook path already does once payment is
      // genuinely confirmed, see resolveTumiziOrderPaymentStatus's own
      // 'paid'/'deposit_paid' cases.
      if (resolvedStatus === 'paid' || resolvedStatus === 'deposit_paid') {
        await prisma.service_bookings.updateMany({
          where: { order_id: id, tenant_id: tenant.id, status: 'pending' },
          data: { status: 'confirmed' },
        });
      }

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
