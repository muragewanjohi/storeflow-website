/**
 * Payment Reminders API Route
 * 
 * GET: Send payment reminder emails to tenants with upcoming or overdue payments
 * 
 * This endpoint should be called by a cron job (daily at 9 AM UTC)
 * Security: Protected by CRON_SECRET_TOKEN
 * 
 * Behavior:
 * - Sends renewal reminders daily for 7 days before expiry (if payment is unpaid)
 * - Sends payment due reminders daily during grace period (2 days after expiry)
 * - Tracks last reminder date in tenants.data.subscription.last_payment_reminder_date
 * - Stops sending after grace period ends (tenant suspended) or payment received
 * 
 * Grace Period: 2 days (configurable via SUBSCRIPTION_GRACE_PERIOD_DAYS)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { sendPaymentDueReminderEmail } from '@/lib/subscriptions/emails';
import { sendSubscriptionRenewalReminderEmail } from '@/lib/subscriptions/emails';
import { startCronJobLog, completeCronJobLog } from '@/lib/cron-jobs/logger';

/**
 * GET /api/admin/subscriptions/payment-reminders
 * Send payment reminder emails
 */
export async function GET(request: NextRequest) {
  const logId = await startCronJobLog({
    jobName: 'Payment Reminders',
    jobPath: '/api/admin/subscriptions/payment-reminders',
  });

  try {
    // Security: Check for Vercel Cron header OR valid token
    // Vercel Cron automatically sends 'x-vercel-cron' header (case-insensitive check)
    // Manual calls require CRON_SECRET_TOKEN via Authorization header or query parameter
    const allHeaders = Object.fromEntries(
      Array.from(request.headers.entries()).map(([k, v]) => [k.toLowerCase(), v])
    );
    const vercelCronHeader = allHeaders['x-vercel-cron'] || allHeaders['x-vercel-signature'];
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const queryToken = searchParams.get('token');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    // Debug logging (only in production to help diagnose issues)
    if (process.env.NODE_ENV === 'production') {
      console.log('[Payment Reminders] Auth check:', {
        hasVercelCronHeader: !!vercelCronHeader,
        hasAuthHeader: !!authHeader,
        hasQueryToken: !!queryToken,
        hasExpectedToken: !!expectedToken,
        allHeaderKeys: Object.keys(allHeaders).filter(k => k.includes('vercel') || k.includes('cron') || k.includes('authorization')),
      });
    }
    
    // Allow if it's a Vercel Cron call (has x-vercel-cron header)
    // OR if token is provided and valid
    // OR if no token is configured (development mode)
    if (expectedToken && !vercelCronHeader) {
      const headerToken = authHeader?.replace('Bearer ', '').trim();
      const providedToken = queryToken || headerToken;
      
      if (!providedToken || providedToken !== expectedToken) {
        const debugInfo = `hasVercelCronHeader: ${!!vercelCronHeader}, hasAuthHeader: ${!!authHeader}, hasQueryToken: ${!!queryToken}, hasExpectedToken: ${!!expectedToken}`;
        await completeCronJobLog(logId, 'failed', {
          error: `Unauthorized - Invalid token. Vercel cron jobs should send x-vercel-cron header or Authorization header with CRON_SECRET_TOKEN. Debug: ${debugInfo}`,
        });
        return NextResponse.json(
          { 
            message: 'Unauthorized',
            error: 'Invalid token. Ensure CRON_SECRET_TOKEN is set in Vercel environment variables and cron jobs are configured correctly.',
          },
          { status: 401 }
        );
      }
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const GRACE_PERIOD_DAYS = parseInt(process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS || '2');

    // Find tenants with subscriptions expiring in 7 days OR already expired (in grace period)
    const tenantsExpiringSoon = await prisma.tenants.findMany({
      where: {
        OR: [
          // Expiring within 7 days (future)
          {
            expire_date: {
              gte: now,
              lte: sevenDaysFromNow,
            },
          },
          // Already expired but in grace period (past expiry but within grace period)
          {
            expire_date: {
              lte: now,
              gte: new Date(now.getTime() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000),
            },
            status: 'expired', // Only expired status (not suspended)
          },
        ],
        status: {
          in: ['active', 'expired'], // Include expired (grace period), exclude suspended
        },
        plan_id: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        custom_domain: true,
        expire_date: true,
        status: true,
        plan_id: true,
        contact_email: true,
        data: true,
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

    // Get latest payment logs for all tenants to check payment status
    const tenantIds = tenantsExpiringSoon.map(t => t.id);
    const allPayments = await prisma.payment_logs.findMany({
      where: {
        tenant_id: {
          in: tenantIds,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Create a map of tenant_id -> latest payment status (get first payment per tenant since ordered by date desc)
    const paymentStatusMap = new Map<string, { status: string; isPaid: boolean }>();
    const seenTenants = new Set<string>();
    for (const payment of allPayments) {
      if (!seenTenants.has(payment.tenant_id)) {
        seenTenants.add(payment.tenant_id);
        const isPaid = payment.status === 'complete' || payment.status === 'trial';
        paymentStatusMap.set(payment.tenant_id, {
          status: payment.status || 'pending',
          isPaid,
        });
      }
    }

    const results = {
      checked: tenantsExpiringSoon.length,
      renewal_reminders_sent: 0,
      payment_reminders_sent: 0,
      errors: [] as string[],
    };

    for (const tenant of tenantsExpiringSoon) {
      try {
        // Type assertion for price_plans relation (Prisma includes it in select but TypeScript may not infer it)
        const tenantWithPlan = tenant as typeof tenant & { 
          price_plans: { 
            id: string; 
            name: string; 
            price: any; // Prisma Decimal type
            duration_months: number 
          } | null 
        };
        if (!tenant.expire_date || !tenantWithPlan.price_plans) continue;

        const daysUntilExpiry = Math.ceil(
          (tenant.expire_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysExpired = Math.floor(
          (now.getTime() - tenant.expire_date.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Get tenant data to track last reminder date and country
        const tenantData = (tenant.data as any) || {};
        const subscriptionData = tenantData.subscription || {};
        const tenantSettings = tenantData.settings || {};
        const lastRenewalReminderDateStr = subscriptionData.last_renewal_reminder_date || null;
        const lastPaymentReminderDateStr = subscriptionData.last_payment_reminder_date || null;
        
        // Check payment status
        const paymentInfo = paymentStatusMap.get(tenant.id);
        const isPaymentUnpaid = !paymentInfo || !paymentInfo.isPaid;

        // Check if we should send reminder today (not sent today yet)
        // Compare date strings (YYYY-MM-DD format) to avoid timezone issues
        const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Determine if we should send reminders today
        // Should send if no previous reminder or last reminder was before today
        const shouldSendRenewalReminder = !lastRenewalReminderDateStr || lastRenewalReminderDateStr < todayStr;
        const shouldSendPaymentReminder = !lastPaymentReminderDateStr || lastPaymentReminderDateStr < todayStr;

        // Detect if tenant is from Kenya (check country from data JSON or settings)
        const tenantCountry = tenantSettings.store_country || '';
        const isKenya = tenantCountry?.toUpperCase() === 'KE' || tenantCountry?.toUpperCase() === 'KENYA';

        // Send renewal reminder (daily for 7 days before expiry, only if payment is unpaid)
        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0 && shouldSendRenewalReminder && isPaymentUnpaid) {
          await sendSubscriptionRenewalReminderEmail({
            tenant: tenant as any,
            expireDate: tenant.expire_date,
            plan: tenantWithPlan.price_plans
              ? {
                  name: tenantWithPlan.price_plans.name,
                  price: Number(tenantWithPlan.price_plans.price),
                  duration_months: tenantWithPlan.price_plans.duration_months,
                }
              : null,
            isKenya,
          });
          results.renewal_reminders_sent++;

          // Update last renewal reminder date
          const updatedData = {
            ...tenantData,
            subscription: {
              ...subscriptionData,
              last_renewal_reminder_date: todayStr, // Store as YYYY-MM-DD
              renewal_reminder_count: (subscriptionData.renewal_reminder_count || 0) + 1,
            },
          };

          await prisma.tenants.update({
            where: { id: tenant.id },
            data: { data: updatedData },
          });
        }

        // Send payment due reminder (daily during grace period or when expiring soon, only if payment is unpaid)
        if (shouldSendPaymentReminder && isPaymentUnpaid && (daysUntilExpiry <= 7 || (daysExpired >= 0 && daysExpired <= GRACE_PERIOD_DAYS))) {
          await sendPaymentDueReminderEmail({
            tenant: tenant as any,
            plan: tenantWithPlan.price_plans
              ? {
                  name: tenantWithPlan.price_plans.name,
                  price: Number(tenantWithPlan.price_plans.price),
                  duration_months: tenantWithPlan.price_plans.duration_months,
                }
              : null,
            amount: tenantWithPlan.price_plans ? Number(tenantWithPlan.price_plans.price) : 0,
            dueDate: tenant.expire_date,
            isKenya,
          });
          results.payment_reminders_sent++;

          // Update last payment reminder date in tenant data
          const updatedData = {
            ...tenantData,
            subscription: {
              ...subscriptionData,
              last_payment_reminder_date: todayStr, // Store as YYYY-MM-DD
              payment_reminder_count: (subscriptionData.payment_reminder_count || 0) + 1,
            },
          };

          await prisma.tenants.update({
            where: { id: tenant.id },
            data: { data: updatedData },
          });
        }
      } catch (error) {
        const errorMsg = `Failed to send reminder to tenant ${tenant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    await completeCronJobLog(logId, 'success', {
      result: results,
    });

    return NextResponse.json(
      {
        message: 'Payment reminders processed',
        results,
        timestamp: now.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing payment reminders:', error);
    await completeCronJobLog(logId, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        message: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to process payment reminders'
      },
      { status: 500 }
    );
  }
}

