/**
 * Debug Script: Check Tenant in Database
 * 
 * Usage: npx tsx scripts/check-tenant.ts <subdomain>
 * 
 * Example: npx tsx scripts/check-tenant.ts smartphones
 */

import { prisma } from '../src/lib/prisma/client';

async function checkTenant(subdomain: string) {
  try {
    console.log(`\n🔍 Checking tenant with subdomain: "${subdomain}"\n`);

    // Check in database
    const tenant = await prisma.tenants.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
    });

    if (!tenant) {
      console.log('❌ Tenant NOT FOUND in database\n');
      
      // List all tenants to help debug
      const allTenants = await prisma.tenants.findMany({
        select: {
          id: true,
          name: true,
          subdomain: true,
          status: true,
          created_at: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 10,
      });

      console.log('📋 Recent tenants in database:');
      allTenants.forEach((t) => {
        console.log(`  - ${t.subdomain} (${t.name}) - Status: ${t.status}`);
      });
      
      return;
    }

    console.log('✅ Tenant FOUND in database:');
    console.log(`   ID: ${tenant.id}`);
    console.log(`   Name: ${tenant.name}`);
    console.log(`   Subdomain: ${tenant.subdomain}`);
    console.log(`   Status: ${tenant.status}`);
    console.log(`   Custom Domain: ${tenant.custom_domain || 'None'}`);
    console.log(`   Created: ${tenant.created_at}`);
    console.log(`   Expires: ${tenant.expire_date || 'Never'}`);
    console.log(`   User ID: ${tenant.user_id || 'None'}`);

    // Check if status is active
    if (tenant.status !== 'active') {
      console.log(`\n⚠️  WARNING: Tenant status is "${tenant.status}", not "active"`);
      console.log('   This will cause "Store not found" errors.');
    }

    // Check if expired
    if (tenant.expire_date && new Date(tenant.expire_date) < new Date()) {
      console.log(`\n⚠️  WARNING: Tenant subscription has expired (${tenant.expire_date})`);
      console.log('   This will cause "Store not found" errors.');
    }

    console.log('\n✅ Tenant looks good!\n');
  } catch (error) {
    console.error('❌ Error checking tenant:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get subdomain from command line args
const args = process.argv.slice(2);
const subdomain = args[0];

if (!subdomain) {
  console.error('Usage: npx tsx scripts/check-tenant.ts <subdomain>');
  console.error('Example: npx tsx scripts/check-tenant.ts smartphones');
  process.exit(1);
}

checkTenant(subdomain);

