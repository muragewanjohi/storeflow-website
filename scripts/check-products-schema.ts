/**
 * Check Products Table Schema
 * 
 * This script checks the actual database schema for the products table
 * to verify what columns exist
 * 
 * Run with: tsx scripts/check-products-schema.ts
 */

import { prisma } from '../src/lib/prisma/client';

async function checkProductsSchema() {
  console.log('🔍 Checking products table schema...\n');

  try {
    // Get column information from information_schema
    const columns = await prisma.$queryRaw<Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>>`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'products' 
        AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    console.log('📊 Products Table Columns:');
    console.log('='.repeat(80));
    console.log(
      'Column Name'.padEnd(25) +
      'Data Type'.padEnd(20) +
      'Nullable'.padEnd(12) +
      'Default'
    );
    console.log('-'.repeat(80));

    columns.forEach(col => {
      console.log(
        col.column_name.padEnd(25) +
        col.data_type.padEnd(20) +
        col.is_nullable.padEnd(12) +
        (col.column_default || 'NULL')
      );
    });

    console.log('\n📋 Summary:');
    console.log(`Total columns: ${columns.length}`);
    
    // Check for 'new' column specifically
    const hasNewColumn = columns.some(col => col.column_name === 'new');
    if (hasNewColumn) {
      console.log('⚠️  WARNING: Found "new" column in database!');
    } else {
      console.log('✅ No "new" column found (as expected)');
    }

    // List all column names
    const columnNames = columns.map(col => col.column_name);
    console.log('\n📝 All column names:');
    console.log(columnNames.join(', '));

    // Check if all expected columns exist
    const expectedColumns = [
      'id', 'tenant_id', 'name', 'slug', 'description', 'short_description',
      'price', 'sale_price', 'sku', 'stock_quantity', 'status', 'image',
      'gallery', 'category_id', 'brand_id', 'created_by', 'metadata',
      'created_at', 'updated_at'
    ];

    const missingColumns = expectedColumns.filter(col => !columnNames.includes(col));
    const extraColumns = columnNames.filter(col => !expectedColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log('\n❌ Missing expected columns:');
      missingColumns.forEach(col => console.log(`  - ${col}`));
    }

    if (extraColumns.length > 0) {
      console.log('\n⚠️  Extra columns in database (not in schema):');
      extraColumns.forEach(col => console.log(`  - ${col}`));
    }

    if (missingColumns.length === 0 && extraColumns.length === 0) {
      console.log('\n✅ Schema matches expected structure!');
    }

  } catch (error: any) {
    console.error('❌ Error checking schema:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkProductsSchema()
  .then(() => {
    console.log('\n✅ Schema check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
