/**
 * Database Seed Script Template
 * 
 * Use this template to create seed scripts for development
 * 
 * Usage:
 * 1. Copy this file to scripts/seed-[description].ts
 * 2. Implement your seed logic
 * 3. Run: npx tsx scripts/seed-[description].ts
 * 
 * Or add to package.json:
 * "db:seed": "tsx scripts/seed-[description].ts"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  try {
    // TODO: Add your seed logic here
    // Example:
    // await prisma.tenant.create({
    //   data: {
    //     subdomain: 'demo',
    //     name: 'Demo Tenant',
    //     status: 'active',
    //   },
    // });

    console.log('✅ Seed completed successfully');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

