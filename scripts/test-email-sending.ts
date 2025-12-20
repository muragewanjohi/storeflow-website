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
 *   - SENDGRID_API_KEY must be set in environment
 *   - At least one tenant with a plan must exist in database
 */

import { prisma } from '../src/lib/prisma/client';
import { sendPaymentDueReminderEmail } from '../src/lib/subscriptions/emails';
import { sendSubscriptionRenewalReminderEmail } from '../src/lib/subscriptions/emails';
import { sendSubscriptionExpiredEmail } from '../src/lib/subscriptions/emails';

async function testEmailSending(testEmail: string) {
  console.log('🧪 Testing Email Sending for Subscription Reminders\n');
  console.log('='.repeat(60));

  // Check SendGrid API key
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY is not set in environment variables');
    console.log('\nPlease set SENDGRID_API_KEY in your .env.local file:');
    console.log('SENDGRID_API_KEY=your-sendgrid-api-key');
    process.exit(1);
  }

  console.log('✅ SendGrid API key found\n');

  // Get a test tenant with a plan
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
    console.error('❌ No tenant found with a plan');
    console.log('\nPlease create a tenant with a plan first.');
    process.exit(1);
  }

  console.log(`📧 Using tenant: ${testTenant.name}`);
  console.log(`📦 Plan: ${testTenant.price_plans?.name || 'N/A'}\n`);

  // Create mock tenant with test email
  const mockTenant = {
    ...testTenant,
    contact_email: testEmail,
  };

  const now = new Date();
  const expireDate = new Date(now);
  expireDate.setDate(expireDate.getDate() + 5); // 5 days from now

  const plan = testTenant.price_plans
    ? {
        name: testTenant.price_plans.name,
        price: Number(testTenant.price_plans.price),
        duration_months: testTenant.price_plans.duration_months,
      }
    : null;

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
      console.log('   ⚠️  Skipped (SendGrid API key not configured)');
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
      amount: Number(testTenant.price_plans?.price || 0),
      dueDate: expireDate,
    });

    if (result?.success === false) {
      console.log('   ❌ Failed:', result.error);
      results.push({ type: 'Payment Due Reminder', success: false, error: result.error });
    } else if (result?.skipped) {
      console.log('   ⚠️  Skipped (SendGrid API key not configured)');
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
      console.log('   ⚠️  Skipped (SendGrid API key not configured)');
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
    console.log('   1. SendGrid API key is correct');
    console.log('   2. Sender email is verified in SendGrid');
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
