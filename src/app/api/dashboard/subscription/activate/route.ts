/**
 * Tenant Subscription Activation API Route
 * 
 * Allows tenants to activate or switch subscription plans
 * Implements best practices:
 * - Upgrades: Immediate effect with prorated billing
 * - Downgrades: Scheduled for next billing cycle
 * - Trial periods: Only for first-time free → paid upgrades
 * - Subscription change history tracking
 * 
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
  sendPlanDowngradeScheduledEmail,
} from '@/lib/subscriptions/emails';
import { detectUserLocation, getLocalizedPrice } from '@/lib/pricing/location';
import {
  calculateUpgradeProration,
  shouldOfferTrialOnUpgrade,
  calculateDaysAsPayingCustomer,
  getPlanChangeType,
} from '@/lib/subscriptions/proration';

const activatePlanSchema = z.object({
  plan_id: z.string().uuid('Invalid plan ID'),
});

/**
 * POST /api/dashboard/subscription/activate
 * 
 * Activate or switch subscription plan for the current tenant
 * Following industry best practices for SaaS billing
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

    // Detect user location for pricing
    const locationInfo = detectUserLocation(request.headers);
    const newPlanPrice = Number(newPlan.price);
    const currentPlanPrice = currentPlan ? Number(currentPlan.price) : 0;

    // Determine change type
    const changeType = getPlanChangeType(currentPlanPrice, newPlanPrice);

    // Check if this is the same plan
    if (changeType === 'same' && currentPlan?.id === newPlan.id) {
      return NextResponse.json(
        { error: 'You are already on this plan' },
        { status: 400 }
      );
    }

    const now = new Date();
    let updatedTenant;
    let proratedAmount = 0;
    let effectiveDate = now;
    let newExpireDate: Date;
    let shouldUseTrial = false;

    // Check if user has upgraded before (for trial eligibility)
    const previousUpgrades = await prisma.subscription_changes.count({
      where: {
        tenant_id: tenant.id,
        change_type: 'upgrade',
      },
    });
    const hasUpgradedBefore = previousUpgrades > 0;

    // Calculate days as paying customer
    const daysAsPayingCustomer = calculateDaysAsPayingCustomer(
      tenant.created_at,
      (tenant as any).start_date,
      currentPlanPrice
    );

    if (changeType === 'upgrade' || !currentPlan) {
      // ============================================
      // UPGRADE: Immediate effect with proration
      // ============================================
      
      // Calculate proration if upgrading mid-cycle
      if (currentPlan && tenant.expire_date && tenant.expire_date > now) {
        const proration = calculateUpgradeProration(
          currentPlanPrice,
          newPlanPrice,
          tenant.expire_date,
          (tenant as any).start_date
        );
        proratedAmount = proration.proratedAmount;
      }

      // Check trial eligibility (only for first-time free → paid)
      shouldUseTrial = shouldOfferTrialOnUpgrade(
        currentPlanPrice,
        daysAsPayingCustomer,
        hasUpgradedBefore
      ) && newPlan.trial_days ? newPlan.trial_days > 0 : false;

      // Calculate new expiration date
      if (shouldUseTrial && newPlan.trial_days) {
        // Use trial period
        newExpireDate = new Date(now);
        newExpireDate.setDate(newExpireDate.getDate() + newPlan.trial_days);
      } else if (currentPlan && tenant.expire_date && tenant.expire_date > now) {
        // Extend from current expiration date
        newExpireDate = new Date(tenant.expire_date);
        newExpireDate.setMonth(newExpireDate.getMonth() + newPlan.duration_months);
      } else {
        // New subscription or expired: start from now
        newExpireDate = new Date(now);
        newExpireDate.setMonth(newExpireDate.getMonth() + newPlan.duration_months);
      }

      effectiveDate = now;

      // Get current tenant data to preserve existing settings
      const tenantWithData = await prisma.tenants.findUnique({
        where: { id: tenant.id },
        select: { data: true },
      });
      const currentData = (tenantWithData?.data as any) || {};

      // Update tenant subscription immediately
      updatedTenant = await prisma.tenants.update({
        where: { id: tenant.id },
        data: {
          plan_id: plan_id,
          expire_date: newExpireDate,
          start_date: shouldUseTrial ? now : (tenant as any).start_date, // Update start date if using trial
          status: 'active',
          upgrade_prorated_amount: proratedAmount > 0 ? proratedAmount : null,
          // Clear any scheduled downgrade
          scheduled_plan_id: null,
          scheduled_plan_change_date: null,
          data: {
            ...currentData,
            subscription: {
              currency: locationInfo.currency,
              currencySymbol: locationInfo.currencySymbol,
              price: getLocalizedPrice(newPlan.name, locationInfo.isKenya),
              planName: newPlan.name,
            },
          },
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

      // Log subscription change
      try {
        await prisma.subscription_changes.create({
          data: {
            tenant_id: tenant.id,
            from_plan_id: currentPlan?.id || null,
            to_plan_id: newPlan.id,
            change_type: currentPlan ? 'upgrade' : 'activation',
            effective_date: effectiveDate,
            prorated_amount: proratedAmount > 0 ? proratedAmount : 0,
            status: 'completed',
            metadata: {
              trialUsed: shouldUseTrial,
              daysAsPayingCustomer,
              hasUpgradedBefore,
            },
          },
        });
      } catch (logError) {
        // Log error but don't fail the request
        console.error('Error logging subscription change:', logError);
      }

      // Send email notifications
      const updatedPlan = updatedTenant.price_plans;

      if (!currentPlan) {
        // New subscription
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
      } else if (changeType === 'upgrade') {
        // Upgrade confirmation
        sendPlanUpgradeConfirmationEmail({
          tenant: updatedTenant as any,
          oldPlan: {
            name: currentPlan.name,
            price: currentPlanPrice,
          },
          newPlan: {
            name: updatedPlan?.name || newPlan.name,
            price: newPlanPrice,
            duration_months: newPlan.duration_months,
          },
          expireDate: updatedTenant.expire_date || new Date(),
          proratedAmount: proratedAmount > 0 ? proratedAmount : undefined,
        }).catch((error) => {
          console.error('Error sending plan upgrade confirmation email:', error);
        });
      }

    } else if (changeType === 'downgrade') {
      // ============================================
      // DOWNGRADE: Schedule for next billing cycle
      // ============================================
      
      if (!tenant.expire_date || tenant.expire_date <= now) {
        return NextResponse.json(
          { error: 'Cannot schedule downgrade: subscription has expired' },
          { status: 400 }
        );
      }

      // Schedule downgrade for next billing cycle
      const scheduledChangeDate = tenant.expire_date;

      // Get current tenant data
      const tenantWithData = await prisma.tenants.findUnique({
        where: { id: tenant.id },
        select: { data: true },
      });
      const currentData = (tenantWithData?.data as any) || {};

      // Update tenant: schedule downgrade but keep current plan active
      updatedTenant = await prisma.tenants.update({
        where: { id: tenant.id },
        data: {
          scheduled_plan_id: plan_id,
          scheduled_plan_change_date: scheduledChangeDate,
          data: {
            ...currentData,
            subscription: {
              ...currentData.subscription,
              scheduledDowngrade: {
                planId: plan_id,
                planName: newPlan.name,
                effectiveDate: scheduledChangeDate,
              },
            },
          },
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

      effectiveDate = scheduledChangeDate;

      // Log scheduled downgrade
      try {
        await prisma.subscription_changes.create({
          data: {
            tenant_id: tenant.id,
            from_plan_id: currentPlan.id,
            to_plan_id: newPlan.id,
            change_type: 'downgrade',
            effective_date: scheduledChangeDate,
            scheduled_change_date: scheduledChangeDate,
            status: 'scheduled',
            metadata: {},
          },
        });
      } catch (logError) {
        console.error('Error logging subscription change:', logError);
      }

      // Send downgrade scheduled email
      if (currentPlan) {
        sendPlanDowngradeScheduledEmail({
          tenant: updatedTenant as any,
          currentPlan: {
            name: currentPlan.name,
            price: currentPlanPrice,
          },
          newPlan: {
            name: newPlan.name,
            price: newPlanPrice,
            duration_months: newPlan.duration_months,
          },
          effectiveDate: scheduledChangeDate,
        }).catch((error) => {
          console.error('Error sending downgrade scheduled email:', error);
        });
      }
    }

    return NextResponse.json({
      message: changeType === 'downgrade'
        ? 'Downgrade scheduled for next billing cycle'
        : 'Subscription activated successfully',
      tenant: {
        id: updatedTenant?.id,
        plan_id: updatedTenant?.plan_id,
        scheduled_plan_id: (updatedTenant as any)?.scheduled_plan_id || null,
        expire_date: updatedTenant?.expire_date,
        status: updatedTenant?.status,
      },
      plan: updatedTenant?.price_plans,
      changeType,
      proratedAmount: changeType === 'upgrade' ? proratedAmount : 0,
      effectiveDate: changeType === 'downgrade' ? effectiveDate : undefined,
      trialUsed: shouldUseTrial,
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
