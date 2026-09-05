/**
 * Tenant Billing History API Route
 * 
 * Handles GET requests for tenant's own billing history
 * 
 * Day 25-26: Subscription Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

/**
 * GET /api/dashboard/subscription/billing
 * Get tenant's own billing history
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    // Verify user belongs to tenant
    if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      );
    }

    // Get tenant with plan details
    const tenantWithPlan = await prisma.tenants.findUnique({
      where: { id: tenant.id },
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

    if (!tenantWithPlan) {
      return NextResponse.json(
        { message: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Fetch real billing history from payment_logs (completed subscription payments)
    const paymentLogs = await prisma.payment_logs.findMany({
      where: {
        tenant_id: tenant.id,
        status: 'completed',
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    const planIds = [
      ...new Set(
        paymentLogs
          .map((log) => (log.metadata as Record<string, unknown>)?.plan_id as string)
          .filter(Boolean)
      ),
    ];
    const plans =
      planIds.length > 0
        ? await prisma.price_plans.findMany({
            where: { id: { in: planIds } },
            select: { id: true, name: true },
          })
        : [];
    const planByName = Object.fromEntries(plans.map((p) => [p.id, p.name]));

    const billingHistory = paymentLogs.map((log) => {
      const meta = (log.metadata ?? {}) as Record<string, unknown>;
      const planId = meta.plan_id as string | undefined;
      const planName = planId ? planByName[planId] ?? 'Subscription' : 'Subscription';
      return {
        id: log.id,
        type: 'subscription',
        description: `Subscription: ${planName}`,
        amount: Number(log.amount),
        currency: log.currency ?? 'USD',
        status: 'active',
        date: log.created_at,
      };
    });

    const renewalDate = tenantWithPlan.expire_date;

    return NextResponse.json(
      {
        billingHistory,
        currentPlan: tenantWithPlan.price_plans,
        subscriptionStatus: tenantWithPlan.status,
        expireDate: tenantWithPlan.expire_date,
        renewalDate,
        startDate: tenantWithPlan.start_date || tenantWithPlan.created_at,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching billing history:', error);

    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { message: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      {
        message: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to fetch billing history'
      },
      { status: 500 }
    );
  }
}

