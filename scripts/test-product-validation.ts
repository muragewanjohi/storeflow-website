/**
 * Test Product Validation Schema
 * 
 * This script tests the product validation schema without requiring a database
 * Run with: tsx scripts/test-product-validation.ts
 */

import { createProductSchema } from '../src/lib/products/validation';

interface TestCase {
  name: string;
  data: any;
  shouldPass: boolean;
  expectedError?: string;
}

const testCases: TestCase[] = [
  // Valid cases
  {
    name: 'Valid product with all fields',
    data: {
      name: 'Test Product',
      price: 29.99,
      stock_quantity: 100,
      status: 'active',
      description: 'Test description',
      short_description: 'Short desc',
      image: 'https://example.com/image.jpg',
      gallery: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      category_id: '29d06150-bca3-43e1-82f2-9a368b668c66',
      sku: 'TEST-001',
    },
    shouldPass: true,
  },
  {
    name: 'Valid product with minimal fields',
    data: {
      name: 'Minimal Product',
      price: 10.00,
    },
    shouldPass: true,
  },
  {
    name: 'Valid product with sale price',
    data: {
      name: 'Sale Product',
      price: 50.00,
      sale_price: 39.99,
      stock_quantity: 50,
    },
    shouldPass: true,
  },
  {
    name: 'Valid product with null category',
    data: {
      name: 'No Category Product',
      price: 25.00,
      category_id: null,
    },
    shouldPass: true,
  },
  
  // Invalid cases
  {
    name: 'Missing required name',
    data: {
      price: 29.99,
    },
    shouldPass: false,
    expectedError: 'name',
  },
  {
    name: 'Missing required price',
    data: {
      name: 'Test Product',
    },
    shouldPass: false,
    expectedError: 'price',
  },
  {
    name: 'Invalid price (negative)',
    data: {
      name: 'Test Product',
      price: -10,
    },
    shouldPass: false,
    expectedError: 'positive',
  },
  {
    name: 'Invalid price (zero)',
    data: {
      name: 'Test Product',
      price: 0,
    },
    shouldPass: false,
    expectedError: 'positive',
  },
  {
    name: 'Sale price greater than price (schema allows, API validates)',
    data: {
      name: 'Test Product',
      price: 50.00,
      sale_price: 60.00,
    },
    shouldPass: true, // Schema doesn't enforce this - API route handles it
    expectedError: 'sale_price',
  },
  {
    name: 'Invalid image URL',
    data: {
      name: 'Test Product',
      price: 29.99,
      image: 'not-a-valid-url',
    },
    shouldPass: false,
    expectedError: 'url',
  },
  {
    name: 'Invalid gallery (not array of URLs)',
    data: {
      name: 'Test Product',
      price: 29.99,
      gallery: ['not-a-url', 'also-not-a-url'],
    },
    shouldPass: false,
    expectedError: 'url',
  },
  {
    name: 'Invalid category_id (not UUID)',
    data: {
      name: 'Test Product',
      price: 29.99,
      category_id: 'not-a-uuid',
    },
    shouldPass: false,
    expectedError: 'uuid',
  },
  {
    name: 'Invalid status',
    data: {
      name: 'Test Product',
      price: 29.99,
      status: 'invalid-status',
    },
    shouldPass: false,
    expectedError: 'status',
  },
  {
    name: 'Name too long',
    data: {
      name: 'A'.repeat(300), // Exceeds 255 character limit
      price: 29.99,
    },
    shouldPass: false,
    expectedError: '255',
  },
];

function runValidationTests() {
  console.log('🧪 Testing Product Validation Schema...\n');
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    try {
      const result = createProductSchema.safeParse(testCase.data);
      const didPass = result.success === testCase.shouldPass;
      
      if (didPass) {
        passed++;
        console.log(`✅ [${index + 1}] ${testCase.name}`);
      } else {
        failed++;
        console.log(`❌ [${index + 1}] ${testCase.name}`);
        if (result.success && !testCase.shouldPass) {
          console.log(`   Expected validation to fail but it passed`);
        } else if (!result.success && testCase.shouldPass) {
          console.log(`   Expected validation to pass but it failed:`);
          if (result.error) {
            result.error.issues.forEach((issue: any) => {
              console.log(`     - ${issue.path.join('.')}: ${issue.message}`);
            });
          }
        }
      }
    } catch (error: any) {
      failed++;
      console.log(`❌ [${index + 1}] ${testCase.name}`);
      console.log(`   Error: ${error.message}`);
    }
  });
  
  console.log('\n📊 Test Summary:');
  console.log('================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${testCases.length}`);
  console.log(`📊 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%\n`);
  
  if (failed === 0) {
    console.log('🎉 All validation tests passed!\n');
    return true;
  } else {
    console.log('⚠️  Some validation tests failed.\n');
    return false;
  }
}

// Run tests
const allPassed = runValidationTests();
process.exit(allPassed ? 0 : 1);
