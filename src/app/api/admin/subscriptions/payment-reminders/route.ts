/**
 * Payment Reminders API Route
 * 
 * GET: Send payment reminder emails to tenants with upcoming or overdue payments
 * 
 * This endpoint should be called by a cron job (daily or weekly)
 * Security: Protected by CRON_SECRET_TOKEN
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { sendPaymentDueReminderEmail } from '@/lib/subscriptions/emails';
import { sendSubscriptionRenewalReminderEmail } from '@/lib/subscriptions/emails';

/**
 * GET /api/admin/subscriptions/payment-reminders
 * Send payment reminder emails
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
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Find tenants with subscriptions expiring in 7 days
    const tenantsExpiringSoon = await prisma.tenants.findMany({
      where: {
        expire_date: {
          gte: now,
          lte: sevenDaysFromNow,
        },
        status: {
          in: ['active', 'expired'], // Include expired (grace period)
        },
        plan_id: {
          not: null,
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

        // Send renewal reminder (7 days before expiry)
        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
          await sendSubscriptionRenewalReminderEmail({
            tenant: tenant as any,
            expireDate: tenant.expire_date,
            plan: tenant.price_plans,
          });
          results.renewal_reminders_sent++;
        }

        // Send payment due reminder (if subscription is expiring soon)
        if (daysUntilExpiry <= 7) {
          await sendPaymentDueReminderEmail({
            tenant: tenant as any,
            plan: tenant.price_plans,
            amount: Number(tenant.price_plans.price),
            dueDate: tenant.expire_date,
          });
          results.payment_reminders_sent++;
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

