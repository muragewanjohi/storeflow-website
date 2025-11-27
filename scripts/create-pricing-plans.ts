/**
 * Script to create three pricing plans with 14-day trial periods
 * 
 * Run with: npx tsx scripts/create-pricing-plans.ts
 * Or: npx ts-node scripts/create-pricing-plans.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createPricingPlans() {
  try {
    console.log('Creating pricing plans...');

    // Check if plans already exist
    const existingPlans = await prisma.price_plans.findMany({
      where: {
        name: {
          in: ['Basic Plan', 'Pro Plan', 'Enterprise Plan'],
        },
      },
      select: {
        name: true,
      },
    });

    if (existingPlans.length > 0) {
      console.log('Pricing plans already exist. Skipping creation.');
      console.log('Existing plans:', existingPlans.map((p: { name: string }) => p.name));
      return;
    }

    // Basic Plan
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

    console.log('✅ Created Basic Plan:', basicPlan.id);

    // Pro Plan
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

    console.log('✅ Created Pro Plan:', proPlan.id);

    // Enterprise Plan
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

    console.log('✅ Created Enterprise Plan:', enterprisePlan.id);

    console.log('\n🎉 All pricing plans created successfully!');
    console.log('\nPlans Summary:');
    console.log('1. Basic Plan - $29.99/month - 14-day trial');
    console.log('2. Pro Plan - $79.99/month - 14-day trial');
    console.log('3. Enterprise Plan - $199.99/month - 14-day trial');
  } catch (error) {
    console.error('Error creating pricing plans:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createPricingPlans()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

