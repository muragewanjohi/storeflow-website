/**
 * Test Email Sending Script
 * 
 * This script tests actual email sending for subscription reminders.
 * It will send real emails to the specified address.
 * 
 * Usage:
 *   tsx scripts/test-email-sending.ts your-email@example.com
 * 
 * Prerequisites:
 *   - RESEND_API_KEY must be set in .env.local
 *   - At least one tenant with a plan must exist in database
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { prisma } from '../src/lib/prisma/client';
import { sendPaymentDueReminderEmail } from '../src/lib/subscriptions/emails';
import { sendSubscriptionRenewalReminderEmail } from '../src/lib/subscriptions/emails';
import { sendSubscriptionExpiredEmail } from '../src/lib/subscriptions/emails';

async function testEmailSending(testEmail: string) {
  console.log('🧪 Testing Email Sending for Subscription Reminders\n');
  console.log('='.repeat(60));

  // Check Resend API key (legacy SENDGRID_API_KEY accepted for compatibility)
  if (!process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
    console.error('❌ RESEND_API_KEY is not set in environment variables');
    console.log('\nPlease set RESEND_API_KEY in your .env.local file:');
    console.log('RESEND_API_KEY=re_...');
    process.exit(1);
  }

  console.log('✅ Email provider API key found\n');

  // Try to get a real tenant, but fall back to mock data if database is unavailable
  let testTenant: any = null;
  let useMockData = false;

  try {
    testTenant = await prisma.tenants.findFirst({
      where: {
        plan_id: {
          not: null,
        },
      },
      include: {
        price_plans: true,
      },
    });

    if (testTenant) {
      console.log(`📧 Using tenant from database: ${testTenant.name}`);
      console.log(`📦 Plan: ${testTenant.price_plans?.name || 'N/A'}\n`);
    } else {
      console.log('⚠️  No tenant found in database, using mock data\n');
      useMockData = true;
    }
  } catch (error) {
    console.log('⚠️  Database connection unavailable, using mock data');
    console.log('   (This is okay for email testing)\n');
    useMockData = true;
  }

  // Create mock tenant data if needed
  const mockTenant = useMockData
    ? {
        id: 'test-tenant-id',
        name: 'Test Tenant',
        subdomain: 'test',
        contact_email: testEmail,
        data: {},
      }
    : {
        ...testTenant,
        contact_email: testEmail,
      };

  const now = new Date();
  const expireDate = new Date(now);
  expireDate.setDate(expireDate.getDate() + 5); // 5 days from now

  // Use real plan data if available, otherwise use mock
  const plan = useMockData
    ? {
        name: 'Basic Plan',
        price: 29.99,
        duration_months: 1,
      }
    : testTenant?.price_plans
    ? {
        name: testTenant.price_plans.name,
        price: Number(testTenant.price_plans.price),
        duration_months: testTenant.price_plans.duration_months,
      }
    : {
        name: 'Basic Plan',
        price: 29.99,
        duration_months: 1,
      };

  const results: Array<{ type: string; success: boolean; error?: string }> = [];

  // Test 1: Renewal Reminder
  console.log('1️⃣  Testing Renewal Reminder Email...');
  try {
    const result = await sendSubscriptionRenewalReminderEmail({
      tenant: mockTenant as any,
      expireDate,
      plan,
    });

    if (result?.success === false) {
      console.log('   ❌ Failed:', result.error);
      results.push({ type: 'Renewal Reminder', success: false, error: result.error });
    } else if (result?.skipped) {
      console.log('   ⚠️  Skipped (email provider API key not configured)');
      results.push({ type: 'Renewal Reminder', success: false, error: 'Skipped - API key not configured' });
    } else {
      console.log('   ✅ Sent successfully');
      results.push({ type: 'Renewal Reminder', success: true });
    }
  } catch (error) {
    console.log('   ❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    results.push({ type: 'Renewal Reminder', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }

  // Wait a bit between emails
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Payment Due Reminder
  console.log('\n2️⃣  Testing Payment Due Reminder Email...');
  try {
    const result = await sendPaymentDueReminderEmail({
      tenant: mockTenant as any,
      plan,
      amount: plan.price,
      dueDate: expireDate,
    });

    if (result?.success === false) {
      console.log('   ❌ Failed:', result.error);
      results.push({ type: 'Payment Due Reminder', success: false, error: result.error });
    } else if (result?.skipped) {
      console.log('   ⚠️  Skipped (email provider API key not configured)');
      results.push({ type: 'Payment Due Reminder', success: false, error: 'Skipped - API key not configured' });
    } else {
      console.log('   ✅ Sent successfully');
      results.push({ type: 'Payment Due Reminder', success: true });
    }
  } catch (error) {
    console.log('   ❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    results.push({ type: 'Payment Due Reminder', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }

  // Wait a bit between emails
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Expired Email
  console.log('\n3️⃣  Testing Subscription Expired Email...');
  try {
    const result = await sendSubscriptionExpiredEmail({
      tenant: mockTenant as any,
      plan,
    });

    if (result?.success === false) {
      console.log('   ❌ Failed:', result.error);
      results.push({ type: 'Subscription Expired', success: false, error: result.error });
    } else if (result?.skipped) {
      console.log('   ⚠️  Skipped (email provider API key not configured)');
      results.push({ type: 'Subscription Expired', success: false, error: 'Skipped - API key not configured' });
    } else {
      console.log('   ✅ Sent successfully');
      results.push({ type: 'Subscription Expired', success: true });
    }
  } catch (error) {
    console.log('   ❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    results.push({ type: 'Subscription Expired', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.type}: ${result.success ? 'Sent' : result.error || 'Failed'}`);
  });

  console.log(`\nTotal: ${results.length} emails`);
  console.log(`Sent: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n⚠️  Some emails failed to send. Check:');
    console.log('   1. RESEND_API_KEY is correct');
    console.log('   2. Sender domain/email is verified in Resend');
    console.log('   3. Email address is valid');
    process.exit(1);
  } else {
    console.log(`\n🎉 All emails sent successfully!`);
    console.log(`\n📬 Check your inbox at: ${testEmail}`);
    console.log('   (Also check spam folder if not received)');
    process.exit(0);
  }
}

// Main
const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Email address is required');
  console.log('\nUsage:');
  console.log('  tsx scripts/test-email-sending.ts your-email@example.com');
  process.exit(1);
}

testEmailSending(testEmail)
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
