/**
 * Subscription Expiry Checker API Route
 * 
 * This endpoint checks for expired subscriptions and applies grace period logic
 * Can be called by a cron job (Vercel Cron, GitHub Actions, etc.)
 * 
 * Usage:
 * - Vercel Cron: Add to vercel.json
 * - Manual: GET /api/admin/subscriptions/expiry-checker
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { sendSubscriptionExpiredEmail } from '@/lib/subscriptions/emails';

// Grace period in days (default: 7 days)
const GRACE_PERIOD_DAYS = parseInt(process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS || '7');

/**
 * GET /api/admin/subscriptions/expiry-checker
 * Check for expired subscriptions and update tenant status
 * 
 * This is a public endpoint that should be protected by a secret token
 * or called only from cron jobs
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add secret token check for security
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const gracePeriodEnd = new Date(now);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() - GRACE_PERIOD_DAYS);

    // Find tenants with expired subscriptions
    const expiredTenants = await prisma.tenants.findMany({
      where: {
        expire_date: {
          lte: now, // Expired
        },
        status: {
          not: 'deleted', // Don't process deleted tenants
        },
        plan_id: {
          not: null, // Only tenants with active plans
        },
      },
      include: {
        price_plans: true,
      },
    });

    const results = {
      checked: expiredTenants.length,
      expired: 0,
      gracePeriod: 0,
      suspended: 0,
      errors: [] as string[],
    };

    for (const tenant of expiredTenants) {
      try {
        if (!tenant.expire_date) continue;

        const daysExpired = Math.floor(
          (now.getTime() - tenant.expire_date.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysExpired <= GRACE_PERIOD_DAYS) {
          // Still in grace period - mark as expired but keep active
          if (tenant.status !== 'expired') {
            await prisma.tenants.update({
              where: { id: tenant.id },
              data: { status: 'expired' },
            });
            results.expired++;
            results.gracePeriod++;
            
            // Send expired email notification (only once when status changes)
            sendSubscriptionExpiredEmail({
              tenant: tenant as any,
              plan: tenant.price_plans
                ? {
                    name: tenant.price_plans.name,
                    price: Number(tenant.price_plans.price),
                    duration_months: tenant.price_plans.duration_months,
                  }
                : null,
            }).catch((error) => {
              console.error(`Error sending expired email to tenant ${tenant.id}:`, error);
            });
          }
        } else {
          // Past grace period - suspend tenant
          if (tenant.status !== 'suspended') {
            await prisma.tenants.update({
              where: { id: tenant.id },
              data: { status: 'suspended' },
            });
            results.suspended++;
          }
        }
      } catch (error) {
        const errorMsg = `Failed to process tenant ${tenant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return NextResponse.json(
      {
        message: 'Expiry check completed',
        results,
        timestamp: now.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking subscription expiry:', error);
    return NextResponse.json(
      {
        message: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to check subscription expiry'
      },
      { status: 500 }
    );
  }
}

