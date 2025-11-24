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

    // For now, return current subscription info
    // In production, you'd query a billing_logs or payment_logs table
    const billingHistory = [
      {
        id: 'current',
        type: 'subscription',
        description: tenantWithPlan.price_plans
          ? `Subscription: ${tenantWithPlan.price_plans.name}`
          : 'No active subscription',
        amount: tenantWithPlan.price_plans?.price || 0,
        status: tenantWithPlan.status,
        date: tenantWithPlan.created_at,
        expireDate: tenantWithPlan.expire_date,
      },
    ];

    // Calculate renewal date (same as expire_date for now, but could be different in future)
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

