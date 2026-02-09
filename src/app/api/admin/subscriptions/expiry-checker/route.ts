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
import { sendSubscriptionExpiredEmail, sendSubscriptionSuspendedEmail } from '@/lib/subscriptions/emails';
import { getTenantSubscriptionPricing } from '@/lib/subscriptions/pricing';
import { startCronJobLog, completeCronJobLog } from '@/lib/cron-jobs/logger';

// Grace period in days (default: 2 days)
const GRACE_PERIOD_DAYS = parseInt(process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS || '2');

/**
 * GET /api/admin/subscriptions/expiry-checker
 * Check for expired subscriptions and update tenant status
 * 
 * This is a public endpoint that should be protected by a secret token
 * or called only from cron jobs
 */
export async function GET(request: NextRequest) {
  const logId = await startCronJobLog({
    jobName: 'Expiry Checker',
    jobPath: '/api/admin/subscriptions/expiry-checker',
  });

  try {
    // Security: Check for Vercel Cron header OR valid token
    // Import the shared auth utility
    const { verifyCronJobAuth } = await import('@/lib/cron-jobs/auth');
    const authResult = verifyCronJobAuth(request);
    
    // Debug logging (only in production to help diagnose issues)
    if (process.env.NODE_ENV === 'production' && !authResult.authorized) {
      console.log('[Expiry Checker] Auth check failed:', authResult.debug);
    }
    
    if (!authResult.authorized) {
      const debugInfo = authResult.debug 
        ? `hasVercelCronHeader: ${authResult.debug.hasVercelCronHeader}, hasAuthHeader: ${authResult.debug.hasAuthHeader}, hasQueryToken: ${authResult.debug.hasQueryToken}, hasExpectedToken: ${authResult.debug.hasExpectedToken}`
        : 'No debug info available';
      
      await completeCronJobLog(logId, 'failed', {
        error: `Unauthorized - ${authResult.reason || 'Invalid token'}. Vercel cron jobs should send x-vercel-cron header or Authorization header with CRON_SECRET_TOKEN. Debug: ${debugInfo}`,
      });
      return NextResponse.json(
        { 
          message: 'Unauthorized',
          error: authResult.reason || 'Invalid token. Ensure CRON_SECRET_TOKEN is set in Vercel environment variables and cron jobs are configured correctly.',
        },
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
            
            // Get subscription pricing (with currency) for email
            const subscriptionPricing = tenant.price_plans
              ? getTenantSubscriptionPricing(
                  tenant as any,
                  {
                    name: tenant.price_plans.name,
                    price: tenant.price_plans.price,
                  },
                  (tenant.data as any)?.subscription?.currency === 'KES'
                )
              : null;

            // Detect if tenant is from Kenya
            const tenantCountry = tenant.country || (tenant.data as any)?.subscription?.countryCode || (tenant.data as any)?.settings?.store_country || '';
            const tenantCurrency = (tenant.data as any)?.subscription?.currency || '';
            const isKenya = tenantCountry?.toUpperCase() === 'KE' || tenantCountry?.toUpperCase() === 'KENYA' || tenantCurrency === 'KES';

            // Send expired email notification (only once when status changes)
            sendSubscriptionExpiredEmail({
              tenant: tenant as any,
              plan: subscriptionPricing
                ? {
                    name: subscriptionPricing.planName,
                    price: subscriptionPricing.price,
                    currency: subscriptionPricing.currency,
                    currencySymbol: subscriptionPricing.currencySymbol,
                    duration_months: tenant.price_plans?.duration_months || 0,
                  }
                : tenant.price_plans
                ? {
                    name: tenant.price_plans.name,
                    price: Number(tenant.price_plans.price),
                    duration_months: tenant.price_plans.duration_months,
                  }
                : null,
              isKenya,
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
            
            // Send suspension email notification (only once when status changes)
            const { sendSubscriptionSuspendedEmail } = await import('@/lib/subscriptions/emails');
            const subscriptionPricing = tenant.price_plans
              ? getTenantSubscriptionPricing(
                  tenant as any,
                  {
                    name: tenant.price_plans.name,
                    price: tenant.price_plans.price,
                  },
                  (tenant.data as any)?.subscription?.currency === 'KES'
                )
              : null;

            // Detect if tenant is from Kenya
            const suspTenantCountry = tenant.country || (tenant.data as any)?.subscription?.countryCode || (tenant.data as any)?.settings?.store_country || '';
            const suspTenantCurrency = (tenant.data as any)?.subscription?.currency || '';
            const suspIsKenya = suspTenantCountry?.toUpperCase() === 'KE' || suspTenantCountry?.toUpperCase() === 'KENYA' || suspTenantCurrency === 'KES';

            sendSubscriptionSuspendedEmail({
              tenant: tenant as any,
              plan: subscriptionPricing
                ? {
                    name: subscriptionPricing.planName,
                    price: subscriptionPricing.price,
                    currency: subscriptionPricing.currency,
                    currencySymbol: subscriptionPricing.currencySymbol,
                    duration_months: tenant.price_plans?.duration_months || 0,
                  }
                : tenant.price_plans
                ? {
                    name: tenant.price_plans.name,
                    price: Number(tenant.price_plans.price),
                    duration_months: tenant.price_plans.duration_months,
                  }
                : null,
              isKenya: suspIsKenya,
            }).catch((error) => {
              console.error(`Error sending suspended email to tenant ${tenant.id}:`, error);
            });
          }
        }
      } catch (error) {
        const errorMsg = `Failed to process tenant ${tenant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    const response = {
      message: 'Expiry check completed',
      results,
      timestamp: now.toISOString(),
    };

    await completeCronJobLog(logId, 'success', {
      result: response.results,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error checking subscription expiry:', error);
    
    await completeCronJobLog(logId, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
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

