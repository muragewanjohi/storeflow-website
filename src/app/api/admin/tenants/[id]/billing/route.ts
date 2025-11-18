/**
 * Tenant Billing History API Route
 * 
 * Handles GET requests for tenant billing history
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/tenants/[id]/billing
 * Get tenant billing history (landlord only)
 * 
 * Note: This currently returns subscription changes from tenant history.
 * In production, you'd want a dedicated billing_logs or payment_logs table.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const { id } = await params;

    // Check if tenant exists
    const tenant = await prisma.tenants.findUnique({
      where: { id },
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

    if (!tenant) {
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
        description: tenant.price_plans
          ? `Subscription: ${tenant.price_plans.name}`
          : 'No active subscription',
        amount: tenant.price_plans?.price || 0,
        status: tenant.status,
        date: tenant.created_at,
        expireDate: tenant.expire_date,
      },
    ];

    // If you have a payment_logs table, you can add:
    // const paymentLogs = await prisma.payment_logs.findMany({
    //   where: { tenant_id: id },
    //   orderBy: { created_at: 'desc' },
    //   take: 50,
    // });

    return NextResponse.json(
      {
        tenant: {
          id: tenant.id,
          name: tenant.name,
        },
        billingHistory,
        currentPlan: tenant.price_plans,
        subscriptionStatus: tenant.status,
        expireDate: tenant.expire_date,
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
          : 'Failed to fetch billing history'
      },
      { status: 500 }
    );
  }
}

