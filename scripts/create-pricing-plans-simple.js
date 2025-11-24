/**
 * Simple script to create three pricing plans with 14-day trial periods
 * 
 * Usage:
 * 1. Make sure you've added trial_days column: ALTER TABLE price_plans ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0;
 * 2. Run: node scripts/create-pricing-plans-simple.js
 * 
 * Or use: npx tsx scripts/create-pricing-plans.ts
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createPricingPlans() {
  try {
    console.log('🚀 Creating pricing plans with 14-day trials...\n');

    // Check if plans already exist
    const existingPlans = await prisma.price_plans.findMany({
      where: {
        name: {
          in: ['Basic Plan', 'Pro Plan', 'Enterprise Plan'],
        },
      },
    });

    if (existingPlans.length > 0) {
      console.log('⚠️  Some pricing plans already exist:');
      existingPlans.forEach(plan => {
        console.log(`   - ${plan.name} (ID: ${plan.id})`);
      });
      console.log('\n💡 To recreate, delete existing plans first or use different names.\n');
      return;
    }

    // 1. Basic Plan
    const basicPlan = await prisma.price_plans.create({
      data: {
        name: 'Basic Plan',
        price: 29.99,
        duration_months: 1,
        trial_days: 14,
        features: {
          max_products: 100,
          max_orders: 500,
          max_storage_mb: 1024, // 1 GB
          max_customers: 1000,
          max_pages: 10,
          max_blogs: 20,
          max_staff_users: 2,
        },
        status: 'active',
      },
    });
    console.log('✅ Created Basic Plan');
    console.log(`   Price: $${basicPlan.price}/month`);
    console.log(`   Trial: ${basicPlan.trial_days} days`);
    console.log(`   ID: ${basicPlan.id}\n`);

    // 2. Pro Plan
    const proPlan = await prisma.price_plans.create({
      data: {
        name: 'Pro Plan',
        price: 79.99,
        duration_months: 1,
        trial_days: 14,
        features: {
          max_products: 1000,
          max_orders: 5000,
          max_storage_mb: 10240, // 10 GB
          max_customers: 10000,
          max_pages: 50,
          max_blogs: 100,
          max_staff_users: 10,
        },
        status: 'active',
      },
    });
    console.log('✅ Created Pro Plan');
    console.log(`   Price: $${proPlan.price}/month`);
    console.log(`   Trial: ${proPlan.trial_days} days`);
    console.log(`   ID: ${proPlan.id}\n`);

    // 3. Enterprise Plan
    const enterprisePlan = await prisma.price_plans.create({
      data: {
        name: 'Enterprise Plan',
        price: 199.99,
        duration_months: 1,
        trial_days: 14,
        features: {
          max_products: -1, // Unlimited
          max_orders: -1, // Unlimited
          max_storage_mb: 102400, // 100 GB
          max_customers: -1, // Unlimited
          max_pages: -1, // Unlimited
          max_blogs: -1, // Unlimited
          max_staff_users: -1, // Unlimited
        },
        status: 'active',
      },
    });
    console.log('✅ Created Enterprise Plan');
    console.log(`   Price: $${enterprisePlan.price}/month`);
    console.log(`   Trial: ${enterprisePlan.trial_days} days`);
    console.log(`   ID: ${enterprisePlan.id}\n`);

    console.log('🎉 All pricing plans created successfully!\n');
    console.log('📋 Summary:');
    console.log('   1. Basic Plan - $29.99/month - 14-day trial');
    console.log('   2. Pro Plan - $79.99/month - 14-day trial');
    console.log('   3. Enterprise Plan - $199.99/month - 14-day trial\n');
    console.log('💡 Next steps:');
    console.log('   - Verify plans: GET /api/admin/price-plans');
    console.log('   - Create a tenant with a plan to test trial period');
    console.log('   - Check subscription page to see trial countdown\n');
  } catch (error) {
    console.error('❌ Error creating pricing plans:', error);
    
    if (error.message.includes('trial_days')) {
      console.error('\n💡 Make sure you\'ve added the trial_days column to the database:');
      console.error('   ALTER TABLE price_plans ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0;\n');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createPricingPlans()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

