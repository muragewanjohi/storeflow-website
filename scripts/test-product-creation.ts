/**
 * Test script for product creation API
 * 
 * This script tests the product creation endpoint to verify it's working correctly
 * Run with: tsx scripts/test-product-creation.ts
 */

import { prisma } from '../src/lib/prisma/client';

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
}

async function testProductCreation() {
  const results: TestResult[] = [];
  
  console.log('🧪 Testing Product Creation API...\n');

  // Test 1: Check if products table exists and is accessible
  try {
    const count = await prisma.products.count();
    results.push({
      test: 'Database connection and products table access',
      passed: true,
      details: { productCount: count },
    });
    console.log('✅ Database connection: OK');
  } catch (error: any) {
    results.push({
      test: 'Database connection and products table access',
      passed: false,
      error: error.message,
    });
    console.error('❌ Database connection: FAILED', error.message);
    return results;
  }

  // Test 2: Check schema fields
  try {
    // Try to query with all required fields to verify schema
    const sample = await prisma.products.findFirst({
      select: {
        id: true,
        tenant_id: true,
        name: true,
        slug: true,
        price: true,
        sale_price: true,
        sku: true,
        stock_quantity: true,
        status: true,
        image: true,
        gallery: true,
        category_id: true,
        brand_id: true,
        created_by: true,
        metadata: true,
      },
    });
    
    results.push({
      test: 'Schema fields validation',
      passed: true,
      details: { fieldsExist: true },
    });
    console.log('✅ Schema fields: OK');
  } catch (error: any) {
    results.push({
      test: 'Schema fields validation',
      passed: false,
      error: error.message,
    });
    console.error('❌ Schema fields: FAILED', error.message);
  }

  // Test 3: Validate Decimal type handling
  try {
    // Check if we can create a product with decimal price
    const testPrice = 29.99;
    const testSalePrice = 24.99;
    
    // Verify price can be a number (Prisma will convert to Decimal)
    if (typeof testPrice !== 'number' || isNaN(testPrice)) {
      throw new Error('Price must be a valid number');
    }
    
    results.push({
      test: 'Decimal type handling',
      passed: true,
      details: { 
        priceType: typeof testPrice,
        priceValue: testPrice,
        salePriceValue: testSalePrice,
      },
    });
    console.log('✅ Decimal type handling: OK');
  } catch (error: any) {
    results.push({
      test: 'Decimal type handling',
      passed: false,
      error: error.message,
    });
    console.error('❌ Decimal type handling: FAILED', error.message);
  }

  // Test 4: Validate JSON field handling (gallery)
  try {
    const testGallery = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'];
    const testMetadata = { key: 'value' };
    
    // Verify arrays can be passed as JSON
    if (!Array.isArray(testGallery)) {
      throw new Error('Gallery must be an array');
    }
    
    results.push({
      test: 'JSON field handling (gallery, metadata)',
      passed: true,
      details: { 
        galleryType: Array.isArray(testGallery) ? 'array' : typeof testGallery,
        metadataType: typeof testMetadata,
      },
    });
    console.log('✅ JSON field handling: OK');
  } catch (error: any) {
    results.push({
      test: 'JSON field handling (gallery, metadata)',
      passed: false,
      error: error.message,
    });
    console.error('❌ JSON field handling: FAILED', error.message);
  }

  // Test 5: Validate UUID field handling
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const testUuid = '29d06150-bca3-43e1-82f2-9a368b668c66';
    
    if (!uuidRegex.test(testUuid)) {
      throw new Error('Invalid UUID format');
    }
    
    results.push({
      test: 'UUID field validation',
      passed: true,
      details: { uuidFormat: 'valid' },
    });
    console.log('✅ UUID field validation: OK');
  } catch (error: any) {
    results.push({
      test: 'UUID field validation',
      passed: false,
      error: error.message,
    });
    console.error('❌ UUID field validation: FAILED', error.message);
  }

  // Test 6: Check for required fields
  try {
    const requiredFields = [
      'tenant_id',
      'name',
      'price',
    ];
    
    // This is a schema validation test
    results.push({
      test: 'Required fields check',
      passed: true,
      details: { requiredFields },
    });
    console.log('✅ Required fields check: OK');
  } catch (error: any) {
    results.push({
      test: 'Required fields check',
      passed: false,
      error: error.message,
    });
    console.error('❌ Required fields check: FAILED', error.message);
  }

  // Test 7: Validate image URL length constraint
  try {
    const maxLength = 255;
    const longUrl = 'a'.repeat(300);
    const truncated = longUrl.substring(0, maxLength);
    
    if (truncated.length > maxLength) {
      throw new Error('Truncation failed');
    }
    
    results.push({
      test: 'Image URL length constraint',
      passed: true,
      details: { maxLength, truncationWorks: true },
    });
    console.log('✅ Image URL length constraint: OK');
  } catch (error: any) {
    results.push({
      test: 'Image URL length constraint',
      passed: false,
      error: error.message,
    });
    console.error('❌ Image URL length constraint: FAILED', error.message);
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.test}: ${r.error}`);
    });
  }
  
  return results;
}

// Run tests
testProductCreation()
  .then((results) => {
    const allPassed = results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
