/**
 * RLS Policies Verification Script
 * 
 * This script verifies that Row-Level Security (RLS) is properly configured
 * on all tenant-scoped tables in the production database.
 * 
 * Usage:
 *   tsx scripts/verify-rls-policies.ts
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!databaseUrl) {
  console.error('❌ Missing required environment variable:');
  console.error('   - DATABASE_URL or DIRECT_URL');
  console.error('\n💡 Tip: Make sure .env.local exists and contains DATABASE_URL');
  process.exit(1);
}

// Use DIRECT_URL for migrations/raw queries (port 5432)
// Use DATABASE_URL for regular queries (port 6543 with connection pooling)
const directUrl = process.env.DIRECT_URL || databaseUrl;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl, // Use direct connection for system table queries
    },
  },
});

// Test database connection
async function testConnection() {
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    return true;
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('   Error:', error instanceof Error ? error.message : String(error));
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check DATABASE_URL or DIRECT_URL in .env.local');
    console.error('   2. Verify database is accessible');
    console.error('   3. For Supabase, use DIRECT_URL (port 5432) for raw queries');
    console.error('   4. Check network/firewall settings');
    console.error('\n💡 Alternative: Use Supabase Dashboard SQL Editor to verify RLS manually');
    return false;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// List of tenant-scoped tables that should have RLS enabled
const TENANT_SCOPED_TABLES = [
  // Core Ecommerce
  'products',
  'orders',
  'order_products',
  'customers',
  'categories',
  'product_categories',
  // Content Management
  'pages',
  'blogs',
  'blog_categories',
  // Product Management
  'product_variants',
  'product_reviews',
  'product_wishlists',
  'product_variant_attributes',
  'attributes',
  'attribute_values',
  'brands',
  // Shopping
  'cart_items',
  'coupons',
  // Customer Management
  'user_delivery_addresses',
  'wallets',
  // Support
  'support_tickets',
  'support_ticket_messages',
  // Media & Configuration
  'media_uploads',
  'static_options',
  // Forms
  'form_builders',
  'form_submissions',
  // Inventory
  'inventory_history',
  // Payments
  'payment_logs',
  // Themes
  'tenant_themes',
  // Location (optional tenant_id)
  'cities',
  'countries',
  'states',
];

// Central/Landlord tables that should remain UNRESTRICTED (no RLS)
const CENTRAL_TABLES = [
  'tenants',
  'price_plans',
  'themes',
  'plugins',
  'custom_domains',
  'admins',
  'landlord_users',
  'landlord_support_tickets',
  'landlord_support_ticket_messages',
];

interface RLSStatus {
  tablename: string;
  rls_enabled: boolean;
  policies_count: number;
}

async function verifyRLSStatus(): Promise<RLSStatus[]> {
  console.log('🔍 Verifying RLS status on tenant-scoped tables...\n');

  const results: RLSStatus[] = [];

  for (const table of TENANT_SCOPED_TABLES) {
    try {
      // Check if RLS is enabled using Prisma raw query
      const rlsResult = await prisma.$queryRaw<Array<{ rowsecurity: boolean }>>`
        SELECT rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = ${table}
      `;

      // Count policies using Prisma raw query
      const policiesResult = await prisma.$queryRaw<Array<{ policyname: string }>>`
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = ${table}
      `;

      const rlsEnabled = rlsResult[0]?.rowsecurity ?? false;
      const policiesCount = policiesResult?.length ?? 0;

      results.push({
        tablename: table,
        rls_enabled: rlsEnabled,
        policies_count: policiesCount,
      });

      const status = rlsEnabled ? '✅' : '❌';
      const policiesStatus = policiesCount > 0 ? '✅' : '⚠️';
      
      console.log(
        `${status} ${table.padEnd(30)} RLS: ${rlsEnabled ? 'Enabled' : 'Disabled'.padEnd(8)} Policies: ${policiesStatus} ${policiesCount}`
      );
    } catch (error) {
      // Table might not exist or connection issue
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('fetch failed') || errorMsg.includes('connect')) {
        console.log(`❌ ${table.padEnd(30)} Connection error - check DATABASE_URL`);
        // Don't add to results if it's a connection error
        continue;
      } else {
        console.log(`⚠️  ${table.padEnd(30)} Error: ${errorMsg}`);
        results.push({
          tablename: table,
          rls_enabled: false,
          policies_count: 0,
        });
      }
    }
  }

  return results;
}

async function testTenantIsolation() {
  console.log('\n🧪 Testing tenant isolation...\n');

  // Create a test tenant
  const { data: testTenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      subdomain: 'test-rls-verification',
      name: 'Test RLS Verification',
      status: 'active',
    })
    .select()
    .single();

  if (tenantError) {
    // Tenant might already exist, try to get it
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', 'test-rls-verification')
      .single();

    if (existingTenant) {
      console.log('✅ Test tenant already exists');
    } else {
      console.error('❌ Failed to create test tenant:', tenantError.message);
      return;
    }
  } else {
    console.log('✅ Test tenant created');
  }

  const tenantId = testTenant?.id || (await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', 'test-rls-verification')
    .single()).data?.id;

  if (!tenantId) {
    console.error('❌ Could not get test tenant ID');
    return;
  }

  // Try to query products without tenant context (should fail or return empty)
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, tenant_id')
    .limit(5);

  if (productsError) {
    console.log('✅ RLS is working - query failed without tenant context');
  } else if (products && products.length > 0) {
    console.log('⚠️  Warning: Products returned without tenant context');
    console.log('   This might indicate RLS is not properly configured');
  } else {
    console.log('✅ RLS is working - no products returned without tenant context');
  }

  // Clean up test tenant
  await supabase
    .from('tenants')
    .delete()
    .eq('subdomain', 'test-rls-verification');

  console.log('✅ Test tenant cleaned up');
}

async function verifyCentralTables() {
  console.log('\n🔍 Verifying central/landlord tables (should be UNRESTRICTED)...\n');

  const results: RLSStatus[] = [];

  for (const table of CENTRAL_TABLES) {
    try {
      const rlsResult = await prisma.$queryRaw<Array<{ rowsecurity: boolean }>>`
        SELECT rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = ${table}
      `;

      const rlsEnabled = rlsResult[0]?.rowsecurity ?? false;

      results.push({
        tablename: table,
        rls_enabled: rlsEnabled,
        policies_count: 0,
      });

      const status = !rlsEnabled ? '✅' : '⚠️';
      const expected = !rlsEnabled ? 'UNRESTRICTED (correct)' : 'HAS RLS (unexpected)';
      
      console.log(`${status} ${table.padEnd(30)} ${expected}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('fetch failed') || errorMsg.includes('connect')) {
        console.log(`❌ ${table.padEnd(30)} Connection error - check DATABASE_URL`);
      } else {
        console.log(`⚠️  ${table.padEnd(30)} Error: ${errorMsg}`);
      }
    }
  }

  return results;
}

async function main() {
  console.log('🚀 RLS Policies Verification\n');
  console.log('=' .repeat(60) + '\n');

  // Test database connection first
  console.log('🔌 Testing database connection...\n');
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }
  console.log('✅ Database connection successful!\n');

  try {
    const results = await verifyRLSStatus();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Tenant-Scoped Tables Summary:\n');

    const enabledCount = results.filter((r) => r.rls_enabled).length;
    const disabledCount = results.filter((r) => !r.rls_enabled).length;
    const withPolicies = results.filter((r) => r.policies_count > 0).length;

    console.log(`   Total tables checked: ${results.length}`);
    console.log(`   ✅ RLS enabled: ${enabledCount}`);
    console.log(`   ❌ RLS disabled: ${disabledCount}`);
    console.log(`   ✅ With policies: ${withPolicies}`);

    if (disabledCount > 0) {
      console.log('\n⚠️  Warning: Some tenant-scoped tables have RLS disabled!');
      console.log('   Tables with RLS disabled:');
      results
        .filter((r) => !r.rls_enabled)
        .forEach((r) => console.log(`     - ${r.tablename}`));
    }

    if (results.some((r) => r.rls_enabled && r.policies_count === 0)) {
      console.log('\n⚠️  Warning: Some tables have RLS enabled but no policies!');
      console.log('   Tables without policies:');
      results
        .filter((r) => r.rls_enabled && r.policies_count === 0)
        .forEach((r) => console.log(`     - ${r.tablename}`));
    }

    // Verify central tables
    const centralResults = await verifyCentralTables();
    const centralWithRLS = centralResults.filter((r) => r.rls_enabled).length;
    
    if (centralWithRLS > 0) {
      console.log('\n⚠️  Warning: Some central/landlord tables have RLS enabled!');
      console.log('   These should remain UNRESTRICTED:');
      centralResults
        .filter((r) => r.rls_enabled)
        .forEach((r) => console.log(`     - ${r.tablename}`));
    }

    // Test tenant isolation
    await testTenantIsolation();

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification complete!\n');
    
    // Provide instructions if RLS is not enabled
    if (results.some((r) => !r.rls_enabled)) {
      console.log('📝 To enable RLS on missing tables, run:');
      console.log('   npx supabase migration up');
      console.log('   OR');
      console.log('   Apply migrations:');
      console.log('   - supabase/migrations/002_setup_rls_policies.sql');
      console.log('   - supabase/migrations/010_enable_rls_all_tenant_tables.sql');
      console.log('   in Supabase Dashboard → SQL Editor\n');
    }
  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
