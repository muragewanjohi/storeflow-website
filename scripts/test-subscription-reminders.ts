/**
 * Manual Test Script for Subscription Reminders
 * 
 * This script helps test both subscription expiry checker and payment reminders
 * by creating test tenants with different scenarios.
 * 
 * Usage:
 *   tsx scripts/test-subscription-reminders.ts
 * 
 * Prerequisites:
 *   - Set CRON_SECRET_TOKEN in environment
 *   - Database connection configured
 *   - SendGrid API key configured (for email testing)
 */

import { prisma } from '../src/lib/prisma/client';

const CRON_SECRET_TOKEN = process.env.CRON_SECRET_TOKEN || 'test-secret-token';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

async function testExpiryChecker(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    console.log('\n🧪 Testing Subscription Expiry Checker...\n');

    // Test 1: Authentication
    console.log('Test 1: Authentication');
    const authResponse = await fetch(`${BASE_URL}/api/admin/subscriptions/expiry-checker`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET_TOKEN}`,
      },
    });

    if (authResponse.status === 200) {
      const data = await authResponse.json();
      results.push({
        name: 'Authentication',
        passed: true,
        message: 'Successfully authenticated',
        details: data,
      });
      console.log('✅ Authentication passed');
      console.log(`   Checked: ${data.results?.checked || 0} tenants`);
      console.log(`   Expired: ${data.results?.expired || 0}`);
      console.log(`   Grace Period: ${data.results?.gracePeriod || 0}`);
      console.log(`   Suspended: ${data.results?.suspended || 0}`);
    } else {
      results.push({
        name: 'Authentication',
        passed: false,
        message: `Failed with status ${authResponse.status}`,
      });
      console.log('❌ Authentication failed');
    }

    // Test 2: Invalid token
    console.log('\nTest 2: Invalid Token Rejection');
    const invalidResponse = await fetch(`${BASE_URL}/api/admin/subscriptions/expiry-checker`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
    });

    if (invalidResponse.status === 401) {
      results.push({
        name: 'Invalid Token Rejection',
        passed: true,
        message: 'Correctly rejected invalid token',
      });
      console.log('✅ Invalid token correctly rejected');
    } else {
      results.push({
        name: 'Invalid Token Rejection',
        passed: false,
        message: `Expected 401, got ${invalidResponse.status}`,
      });
      console.log('❌ Invalid token not rejected');
    }

  } catch (error) {
    results.push({
      name: 'Expiry Checker Tests',
      passed: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    console.log('❌ Error running expiry checker tests:', error);
  }

  return results;
}

async function testPaymentReminders(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    console.log('\n🧪 Testing Payment Reminders...\n');

    // Test 1: Authentication
    console.log('Test 1: Authentication');
    const authResponse = await fetch(`${BASE_URL}/api/admin/subscriptions/payment-reminders`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET_TOKEN}`,
      },
    });

    if (authResponse.status === 200) {
      const data = await authResponse.json();
      results.push({
        name: 'Authentication',
        passed: true,
        message: 'Successfully authenticated',
        details: data,
      });
      console.log('✅ Authentication passed');
      console.log(`   Checked: ${data.results?.checked || 0} tenants`);
      console.log(`   Renewal Reminders Sent: ${data.results?.renewal_reminders_sent || 0}`);
      console.log(`   Payment Reminders Sent: ${data.results?.payment_reminders_sent || 0}`);
      if (data.results?.errors?.length > 0) {
        console.log(`   Errors: ${data.results.errors.length}`);
        data.results.errors.forEach((error: string) => {
          console.log(`     - ${error}`);
        });
      }
    } else {
      results.push({
        name: 'Authentication',
        passed: false,
        message: `Failed with status ${authResponse.status}`,
      });
      console.log('❌ Authentication failed');
    }

    // Test 2: Check grace period configuration
    console.log('\nTest 2: Grace Period Configuration');
    const gracePeriodDays = parseInt(process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS || '2');
    if (gracePeriodDays === 2) {
      results.push({
        name: 'Grace Period Configuration',
        passed: true,
        message: `Grace period correctly set to ${gracePeriodDays} days`,
      });
      console.log(`✅ Grace period correctly configured: ${gracePeriodDays} days`);
    } else {
      results.push({
        name: 'Grace Period Configuration',
        passed: false,
        message: `Expected 2 days, got ${gracePeriodDays} days`,
      });
      console.log(`❌ Grace period incorrect: ${gracePeriodDays} days (expected 2)`);
    }

  } catch (error) {
    results.push({
      name: 'Payment Reminders Tests',
      passed: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    console.log('❌ Error running payment reminders tests:', error);
  }

  return results;
}

async function createTestTenants(): Promise<void> {
  console.log('\n📝 Creating Test Tenants for Manual Testing...\n');

  try {
    // Check if test price plan exists
    let testPlan = await prisma.price_plans.findFirst({
      where: { name: 'Test Plan' },
    });

    if (!testPlan) {
      testPlan = await prisma.price_plans.create({
        data: {
          name: 'Test Plan',
          price: 29.99,
          duration_months: 1,
          status: 'active',
        },
      });
      console.log('✅ Created test price plan');
    }

    const now = new Date();

    // Test Tenant 1: Expiring in 5 days (should get renewal reminders)
    const fiveDaysFromNow = new Date(now);
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

    const tenant1 = await prisma.tenants.upsert({
      where: { subdomain: 'test-expiring-5days' },
      update: {
        expire_date: fiveDaysFromNow,
        status: 'active',
        plan_id: testPlan.id,
        data: {},
      },
      create: {
        subdomain: 'test-expiring-5days',
        name: 'Test Tenant - Expiring in 5 Days',
        expire_date: fiveDaysFromNow,
        status: 'active',
        plan_id: testPlan.id,
        contact_email: 'test-expiring@example.com',
        data: {},
      },
    });
    console.log(`✅ Created/Updated tenant: ${tenant1.name} (expires in 5 days)`);

    // Test Tenant 2: Expired 1 day ago (in grace period, should get payment reminders)
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const tenant2 = await prisma.tenants.upsert({
      where: { subdomain: 'test-expired-1day' },
      update: {
        expire_date: oneDayAgo,
        status: 'expired',
        plan_id: testPlan.id,
        data: {},
      },
      create: {
        subdomain: 'test-expired-1day',
        name: 'Test Tenant - Expired 1 Day Ago',
        expire_date: oneDayAgo,
        status: 'expired',
        plan_id: testPlan.id,
        contact_email: 'test-expired@example.com',
        data: {},
      },
    });
    console.log(`✅ Created/Updated tenant: ${tenant2.name} (expired 1 day ago)`);

    // Test Tenant 3: Expired 3 days ago (past grace period, should be suspended)
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const tenant3 = await prisma.tenants.upsert({
      where: { subdomain: 'test-expired-3days' },
      update: {
        expire_date: threeDaysAgo,
        status: 'expired',
        plan_id: testPlan.id,
        data: {},
      },
      create: {
        subdomain: 'test-expired-3days',
        name: 'Test Tenant - Expired 3 Days Ago',
        expire_date: threeDaysAgo,
        status: 'expired',
        plan_id: testPlan.id,
        contact_email: 'test-suspended@example.com',
        data: {},
      },
    });
    console.log(`✅ Created/Updated tenant: ${tenant3.name} (expired 3 days ago)`);

    console.log('\n📋 Test Tenants Summary:');
    console.log(`   1. ${tenant1.subdomain} - Expires in 5 days (should get renewal reminders)`);
    console.log(`   2. ${tenant2.subdomain} - Expired 1 day ago (should get payment reminders)`);
    console.log(`   3. ${tenant3.subdomain} - Expired 3 days ago (should be suspended)`);

  } catch (error) {
    console.error('❌ Error creating test tenants:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Subscription Reminders Test Script\n');
  console.log('='.repeat(60));

  const allResults: TestResult[] = [];

  try {
    // Create test tenants
    await createTestTenants();

    // Run tests
    const expiryResults = await testExpiryChecker();
    allResults.push(...expiryResults);

    const paymentResults = await testPaymentReminders();
    allResults.push(...paymentResults);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary\n');

    const passed = allResults.filter(r => r.passed).length;
    const failed = allResults.filter(r => !r.passed).length;

    allResults.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.name}: ${result.message}`);
    });

    console.log(`\nTotal: ${allResults.length} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      console.log('\n⚠️  Some tests failed. Check the output above for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { testExpiryChecker, testPaymentReminders, createTestTenants };
