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
    // Optional: Add secret token check for security
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      await completeCronJobLog(logId, 'failed', {
        error: 'Unauthorized - Invalid token',
      });
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
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
        country: true,
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
        if (!tenant.expire_date || !tenant.price_plans) continue;

        const daysUntilExpiry = Math.ceil(
          (tenant.expire_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysExpired = Math.floor(
          (now.getTime() - tenant.expire_date.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Get tenant data to track last reminder date
        const tenantData = (tenant.data as any) || {};
        const subscriptionData = tenantData.subscription || {};
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

        // Detect if tenant is from Kenya (check country field)
        const tenantCountry = (tenant as any).country || '';
        const isKenya = tenantCountry?.toUpperCase() === 'KE' || tenantCountry?.toUpperCase() === 'KENYA';

        // Send renewal reminder (daily for 7 days before expiry, only if payment is unpaid)
        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0 && shouldSendRenewalReminder && isPaymentUnpaid) {
          await sendSubscriptionRenewalReminderEmail({
            tenant: tenant as any,
            expireDate: tenant.expire_date,
            plan: tenant.price_plans
              ? {
                  name: tenant.price_plans.name,
                  price: Number(tenant.price_plans.price),
                  duration_months: tenant.price_plans.duration_months,
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
            plan: tenant.price_plans
              ? {
                  name: tenant.price_plans.name,
                  price: Number(tenant.price_plans.price),
                  duration_months: tenant.price_plans.duration_months,
                }
              : null,
            amount: Number(tenant.price_plans.price),
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

