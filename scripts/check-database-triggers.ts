/**
 * Check Database Triggers and Tables
 * 
 * This script checks for:
 * 1. Tables named 'new' that might conflict
 * 2. Triggers on products table
 * 3. The search_vector trigger function
 * 
 * Run with: tsx scripts/check-database-triggers.ts
 * 
 * Note: Requires DATABASE_URL environment variable
 */

import { prisma } from '../src/lib/prisma/client';

async function checkDatabase() {
  console.log('🔍 Checking database for trigger and table issues...\n');

  try {
    // Check for tables named 'new'
    console.log('1. Checking for tables named "new"...');
    const newTableCheck = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'new';
    `;
    
    if (newTableCheck.length > 0) {
      console.log('⚠️  WARNING: Found table named "new"! This could cause conflicts.');
      console.log('   Table:', newTableCheck[0].table_name);
    } else {
      console.log('✅ No table named "new" found (good)');
    }

    // Check triggers on products table
    console.log('\n2. Checking triggers on products table...');
    const triggers = await prisma.$queryRaw<Array<{
      trigger_name: string;
      event_manipulation: string;
      action_timing: string;
      action_statement: string;
    }>>`
      SELECT 
        trigger_name,
        event_manipulation,
        action_timing,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'products'
        AND event_object_schema = 'public';
    `;

    if (triggers.length > 0) {
      console.log(`✅ Found ${triggers.length} trigger(s) on products table:`);
      triggers.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} (${trigger.action_timing} ${trigger.event_manipulation})`);
      });

      // Check for search_vector trigger specifically
      const searchVectorTrigger = triggers.find(t => t.trigger_name.includes('search_vector'));
      if (searchVectorTrigger) {
        console.log('\n   📋 Search Vector Trigger Details:');
        console.log('   Trigger Name:', searchVectorTrigger.trigger_name);
        console.log('   Timing:', searchVectorTrigger.action_timing);
        console.log('   Event:', searchVectorTrigger.event_manipulation);
        console.log('   Statement:', searchVectorTrigger.action_statement.substring(0, 100) + '...');
      }
    } else {
      console.log('⚠️  No triggers found on products table');
    }

    // Check trigger function
    console.log('\n3. Checking trigger function...');
    const functions = await prisma.$queryRaw<Array<{
      routine_name: string;
      routine_definition: string;
    }>>`
      SELECT 
        routine_name,
        routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name LIKE '%search_vector%';
    `;

    if (functions.length > 0) {
      console.log(`✅ Found ${functions.length} trigger function(s):`);
      functions.forEach(func => {
        console.log(`   - ${func.routine_name}`);
        // Check if function uses 'new' (lowercase) instead of 'NEW' (uppercase)
        if (func.routine_definition.includes('new.search_vector') && !func.routine_definition.includes('NEW.search_vector')) {
          console.log('   ⚠️  WARNING: Function uses lowercase "new" instead of uppercase "NEW"!');
        } else if (func.routine_definition.includes('NEW.search_vector')) {
          console.log('   ✅ Function correctly uses uppercase "NEW"');
        }
      });
    } else {
      console.log('⚠️  No search_vector trigger function found');
    }

    // Check products table columns
    console.log('\n4. Checking products table columns...');
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'products' 
        AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    console.log(`✅ Products table has ${columns.length} columns:`);
    const columnNames = columns.map(c => c.column_name);
    console.log('   Columns:', columnNames.join(', '));

    // Check if 'new' is a column
    if (columnNames.includes('new')) {
      console.log('   ⚠️  WARNING: Found column named "new"! This is the problem.');
    } else {
      console.log('   ✅ No column named "new" (as expected)');
    }

    // Check if search_vector column exists
    if (columnNames.includes('search_vector')) {
      console.log('   ✅ search_vector column exists');
    } else {
      console.log('   ⚠️  search_vector column does not exist (trigger will fail)');
    }

    console.log('\n📊 Summary:');
    console.log('='.repeat(80));
    if (newTableCheck.length > 0) {
      console.log('❌ Issue: Table named "new" exists - this could cause conflicts');
    }
    if (triggers.length === 0) {
      console.log('⚠️  No triggers found - search_vector trigger may not be set up');
    }
    if (!columnNames.includes('search_vector')) {
      console.log('⚠️  search_vector column missing - trigger will fail');
    }
    if (columnNames.includes('new')) {
      console.log('❌ CRITICAL: Column "new" exists in products table - this is the problem!');
    }

  } catch (error: any) {
    console.error('❌ Error checking database:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase()
  .then(() => {
    console.log('\n✅ Database check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
