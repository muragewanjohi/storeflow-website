/**
 * Tenant Subscription Management API Route
 * 
 * Handles subscription operations: upgrade, downgrade, renewal
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { changeSubscriptionSchema } from '@/lib/subscriptions/validation';
import {
  sendSubscriptionActivatedEmail,
  sendPlanUpgradeConfirmationEmail,
} from '@/lib/subscriptions/emails';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/tenants/[id]/subscription
 * Change tenant subscription (upgrade, downgrade, or renew)
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = changeSubscriptionSchema.parse(body);
    const { plan_id, action } = validatedData;

    // Check if tenant exists
    const tenant = await prisma.tenants.findUnique({
      where: { id },
      include: {
        price_plans: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { message: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if plan exists
    const newPlan = await prisma.price_plans.findUnique({
      where: { id: plan_id },
    });

    if (!newPlan) {
      return NextResponse.json(
        { message: 'Price plan not found' },
        { status: 404 }
      );
    }

    if (newPlan.status !== 'active') {
      return NextResponse.json(
        { message: 'Price plan is not active' },
        { status: 400 }
      );
    }

    // Calculate new expiration date
    const now = new Date();
    let newExpireDate: Date;

    if (action === 'renew') {
      // Renewal: Extend from current expire_date (or now if expired)
      const baseDate = tenant.expire_date && tenant.expire_date > now
        ? tenant.expire_date
        : now;
      newExpireDate = new Date(baseDate);
      newExpireDate.setMonth(newExpireDate.getMonth() + newPlan.duration_months);
    } else {
      // Upgrade/Downgrade: Start from now with new plan duration
      // In production, you might want to prorate based on remaining time
      newExpireDate = new Date(now);
      newExpireDate.setMonth(newExpireDate.getMonth() + newPlan.duration_months);
    }

    // Update tenant subscription
    const updatedTenant = await prisma.tenants.update({
      where: { id },
      data: {
        plan_id: plan_id,
        expire_date: newExpireDate,
        status: 'active', // Ensure tenant is active when subscription is updated
      },
      include: {
        price_plans: {
          select: {
            id: true,
            name: true,
            price: true,
            duration_months: true,
          },
        },
      },
    });

    // Log subscription change (you can create a payment_logs entry here)
    // For now, we'll just return success

    // Send email notifications
    const oldPlan = tenant.price_plans;
    const newPlan = updatedTenant.price_plans;

    // Send activation email if this is a new subscription or renewal
    if (action === 'renew' || !oldPlan) {
      sendSubscriptionActivatedEmail({
        tenant: updatedTenant as any,
        plan: newPlan,
        expireDate: updatedTenant.expire_date || new Date(),
      }).catch((error) => {
        console.error('Error sending subscription activated email:', error);
      });
    }

    // Send upgrade confirmation if upgrading
    if (action === 'upgrade' && oldPlan && newPlan) {
      sendPlanUpgradeConfirmationEmail({
        tenant: updatedTenant as any,
        oldPlan: {
          name: oldPlan.name,
          price: Number(oldPlan.price),
        },
        newPlan: {
          name: newPlan.name,
          price: Number(newPlan.price),
          duration_months: newPlan.duration_months,
        },
        expireDate: updatedTenant.expire_date || new Date(),
      }).catch((error) => {
        console.error('Error sending plan upgrade confirmation email:', error);
      });
    }

    return NextResponse.json(
      {
        message: `Subscription ${action || 'updated'} successfully`,
        tenant: updatedTenant,
        newExpireDate: updatedTenant.expire_date,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating subscription:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request data', errors: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { message: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { message: 'Access denied. Landlord role required.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        message: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to update subscription'
      },
      { status: 500 }
    );
  }
}

