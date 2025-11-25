/**
 * Tenant Subscription Activation API Route
 * 
 * Allows tenants to activate or switch subscription plans
 * Only tenant admins can activate plans for their own tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import {
  sendSubscriptionActivatedEmail,
  sendPlanUpgradeConfirmationEmail,
} from '@/lib/subscriptions/emails';

const activatePlanSchema = z.object({
  plan_id: z.string().uuid('Invalid plan ID'),
});

/**
 * POST /api/dashboard/subscription/activate
 * 
 * Activate or switch subscription plan for the current tenant
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    // Only tenant admins can activate plans
    requireAnyRole(user, ['tenant_admin']);

    const tenant = await requireTenant();

    // Verify user belongs to tenant
    if (user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = activatePlanSchema.parse(body);
    const { plan_id } = validatedData;

    // Check if plan exists and is active
    const newPlan = await prisma.price_plans.findUnique({
      where: { id: plan_id },
    });

    if (!newPlan) {
      return NextResponse.json(
        { error: 'Price plan not found' },
        { status: 404 }
      );
    }

    if (newPlan.status !== 'active') {
      return NextResponse.json(
        { error: 'Price plan is not active' },
        { status: 400 }
      );
    }

    // Get current plan for comparison
    const currentPlan = tenant.plan_id
      ? await prisma.price_plans.findUnique({
          where: { id: tenant.plan_id },
        })
      : null;

    // Calculate new expiration date
    const now = new Date();
    let newExpireDate: Date;

    if (currentPlan && tenant.expire_date && tenant.expire_date > now) {
      // If switching plans and still have time left, extend from current expire_date
      newExpireDate = new Date(tenant.expire_date);
      newExpireDate.setMonth(newExpireDate.getMonth() + newPlan.duration_months);
    } else {
      // New subscription or expired: start from now
      newExpireDate = new Date(now);
      // If plan has trial_days, use trial period; otherwise use plan duration
      if (newPlan.trial_days && newPlan.trial_days > 0) {
        newExpireDate.setDate(newExpireDate.getDate() + newPlan.trial_days);
      } else {
        newExpireDate.setMonth(newExpireDate.getMonth() + newPlan.duration_months);
      }
    }

    // Update tenant subscription
    const updatedTenant = await prisma.tenants.update({
      where: { id: tenant.id },
      data: {
        plan_id: plan_id,
        expire_date: newExpireDate,
        status: 'active', // Ensure tenant is active when subscription is activated
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

    // Send email notifications
    const updatedPlan = updatedTenant.price_plans;

    // Send activation email if this is a new subscription
    if (!currentPlan) {
      sendSubscriptionActivatedEmail({
        tenant: updatedTenant as any,
        plan: updatedPlan
          ? {
              name: updatedPlan.name,
              price: Number(updatedPlan.price),
              duration_months: updatedPlan.duration_months,
            }
          : null,
        expireDate: updatedTenant.expire_date || new Date(),
      }).catch((error) => {
        console.error('Error sending subscription activated email:', error);
      });
    }

    // Send upgrade confirmation if upgrading
    if (currentPlan && updatedPlan && Number(updatedPlan.price) > Number(currentPlan.price)) {
      sendPlanUpgradeConfirmationEmail({
        tenant: updatedTenant as any,
        oldPlan: {
          name: currentPlan.name,
          price: Number(currentPlan.price),
        },
        newPlan: {
          name: updatedPlan.name,
          price: Number(updatedPlan.price),
          duration_months: updatedPlan.duration_months,
        },
        expireDate: updatedTenant.expire_date || new Date(),
      }).catch((error) => {
        console.error('Error sending plan upgrade confirmation email:', error);
      });
    }

    return NextResponse.json({
      message: 'Subscription activated successfully',
      tenant: {
        id: updatedTenant.id,
        plan_id: updatedTenant.plan_id,
        expire_date: updatedTenant.expire_date,
        status: updatedTenant.status,
      },
      plan: updatedPlan,
    });
  } catch (error) {
    console.error('Error activating subscription:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to activate subscription')
          : 'Failed to activate subscription'
      },
      { status: 500 }
    );
  }
}

