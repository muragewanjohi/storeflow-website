/**
 * Test Email Endpoint
 * 
 * This endpoint allows you to test subscription reminder emails
 * by actually sending them to a specified email address.
 * 
 * WARNING: This should only be used in development/staging environments!
 * 
 * Usage:
 *   POST /api/admin/subscriptions/test-email
 *   Body: {
 *     "email": "your-email@example.com",
 *     "type": "renewal" | "payment_due" | "expired"
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { sendPaymentDueReminderEmail } from '@/lib/subscriptions/emails';
import { sendSubscriptionRenewalReminderEmail } from '@/lib/subscriptions/emails';
import { sendSubscriptionExpiredEmail } from '@/lib/subscriptions/emails';

export async function POST(request: NextRequest) {
  // Only allow in development/staging
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { message: 'This endpoint is not available in production' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email, type = 'renewal' } = body;

    if (!email) {
      return NextResponse.json(
        { message: 'Email address is required' },
        { status: 400 }
      );
    }

    // Get a test tenant and plan (or create mock data)
    const testTenant = await prisma.tenants.findFirst({
      where: {
        plan_id: {
          not: null,
        },
      },
      include: {
        price_plans: true,
      },
    });

    if (!testTenant) {
      return NextResponse.json(
        { message: 'No tenant found with a plan. Please create a tenant with a plan first.' },
        { status: 404 }
      );
    }

    // Create mock tenant data with the test email
    const mockTenant = {
      ...testTenant,
      contact_email: email,
    };

    const now = new Date();
    const expireDate = new Date(now);
    expireDate.setDate(expireDate.getDate() + 5); // 5 days from now

    let emailResult;
    let emailType;

    switch (type) {
      case 'renewal':
        emailType = 'Subscription Renewal Reminder';
        emailResult = await sendSubscriptionRenewalReminderEmail({
          tenant: mockTenant as any,
          expireDate,
          plan: testTenant.price_plans
            ? {
                name: testTenant.price_plans.name,
                price: Number(testTenant.price_plans.price),
                duration_months: testTenant.price_plans.duration_months,
              }
            : null,
        });
        break;

      case 'payment_due':
        emailType = 'Payment Due Reminder';
        emailResult = await sendPaymentDueReminderEmail({
          tenant: mockTenant as any,
          plan: testTenant.price_plans
            ? {
                name: testTenant.price_plans.name,
                price: Number(testTenant.price_plans.price),
                duration_months: testTenant.price_plans.duration_months,
              }
            : null,
          amount: Number(testTenant.price_plans?.price || 0),
          dueDate: expireDate,
        });
        break;

      case 'expired':
        emailType = 'Subscription Expired';
        emailResult = await sendSubscriptionExpiredEmail({
          tenant: mockTenant as any,
          plan: testTenant.price_plans
            ? {
                name: testTenant.price_plans.name,
                price: Number(testTenant.price_plans.price),
                duration_months: testTenant.price_plans.duration_months,
              }
            : null,
        });
        break;

      default:
        return NextResponse.json(
          { message: `Invalid email type. Use 'renewal', 'payment_due', or 'expired'` },
          { status: 400 }
        );
    }

    if (emailResult?.success === false) {
      return NextResponse.json(
        {
          message: `Failed to send ${emailType} email`,
          error: emailResult.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `${emailType} email sent successfully`,
      email,
      type,
      skipped: emailResult?.skipped || false,
      usedFallback: emailResult?.usedFallback || false,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      {
        message: 'Failed to send test email',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
