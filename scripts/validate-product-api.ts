/**
 * Validate Product API Route Structure
 * 
 * This script validates the product API route code structure without requiring a database connection
 * Run with: tsx scripts/validate-product-api.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  check: string;
  passed: boolean;
  message: string;
}

function validateProductAPI(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const apiRoutePath = path.join(__dirname, '../src/app/api/products/route.ts');
  
  console.log('🔍 Validating Product API Route Structure...\n');

  // Check if file exists
  if (!fs.existsSync(apiRoutePath)) {
    results.push({
      check: 'API route file exists',
      passed: false,
      message: 'File not found: src/app/api/products/route.ts',
    });
    return results;
  }

  results.push({
    check: 'API route file exists',
    passed: true,
    message: 'File found',
  });

  const fileContent = fs.readFileSync(apiRoutePath, 'utf-8');

  // Check for POST handler
  const hasPostHandler = /export\s+async\s+function\s+POST/.test(fileContent);
  results.push({
    check: 'POST handler exists',
    passed: hasPostHandler,
    message: hasPostHandler ? 'POST handler found' : 'POST handler not found',
  });

  // Check for authentication
  const hasAuth = /requireAuth/.test(fileContent);
  results.push({
    check: 'Authentication check',
    passed: hasAuth,
    message: hasAuth ? 'requireAuth() called' : 'requireAuth() not found',
  });

  // Check for tenant resolution
  const hasTenant = /requireTenant/.test(fileContent);
  results.push({
    check: 'Tenant resolution',
    passed: hasTenant,
    message: hasTenant ? 'requireTenant() called' : 'requireTenant() not found',
  });

  // Check for validation schema
  const hasValidation = /createProductSchema/.test(fileContent);
  results.push({
    check: 'Validation schema',
    passed: hasValidation,
    message: hasValidation ? 'createProductSchema used' : 'createProductSchema not found',
  });

  // Check for error handling
  const hasErrorHandling = /catch\s*\(/.test(fileContent);
  results.push({
    check: 'Error handling',
    passed: hasErrorHandling,
    message: hasErrorHandling ? 'Error handling present' : 'No error handling found',
  });

  // Check for Prisma error handling
  const hasPrismaErrorHandling = /P2002|P2003|prismaError/.test(fileContent);
  results.push({
    check: 'Prisma error handling',
    passed: hasPrismaErrorHandling,
    message: hasPrismaErrorHandling ? 'Prisma error codes handled' : 'Prisma error handling missing',
  });

  // Check for logging
  const hasLogging = /console\.(log|error)/.test(fileContent);
  results.push({
    check: 'Debug logging',
    passed: hasLogging,
    message: hasLogging ? 'Console logging present' : 'No debug logging found',
  });

  // Check for price validation
  const hasPriceValidation = /price.*positive|price.*number/.test(fileContent);
  results.push({
    check: 'Price validation',
    passed: hasPriceValidation,
    message: hasPriceValidation ? 'Price validation present' : 'Price validation missing',
  });

  // Check for image URL length check
  const hasImageLengthCheck = /imageUrl.*length|255/.test(fileContent);
  results.push({
    check: 'Image URL length validation',
    passed: hasImageLengthCheck,
    message: hasImageLengthCheck ? 'Image URL length check present' : 'Image URL length check missing',
  });

  // Check for gallery handling
  const hasGalleryHandling = /gallery.*Array\.isArray/.test(fileContent);
  results.push({
    check: 'Gallery array handling',
    passed: hasGalleryHandling,
    message: hasGalleryHandling ? 'Gallery array validation present' : 'Gallery array validation missing',
  });

  // Check for SKU generation
  const hasSKUGeneration = /generateSKU|finalSKU/.test(fileContent);
  results.push({
    check: 'SKU generation',
    passed: hasSKUGeneration,
    message: hasSKUGeneration ? 'SKU generation present' : 'SKU generation missing',
  });

  // Check for slug generation
  const hasSlugGeneration = /generateSlug/.test(fileContent);
  results.push({
    check: 'Slug generation',
    passed: hasSlugGeneration,
    message: hasSlugGeneration ? 'Slug generation present' : 'Slug generation missing',
  });

  // Check for category validation
  const hasCategoryValidation = /category_id.*findFirst|category.*tenant/.test(fileContent);
  results.push({
    check: 'Category validation',
    passed: hasCategoryValidation,
    message: hasCategoryValidation ? 'Category validation present' : 'Category validation missing',
  });

  // Check for response structure
  const hasSuccessResponse = /status.*201|NextResponse\.json.*product/.test(fileContent);
  results.push({
    check: 'Success response structure',
    passed: hasSuccessResponse,
    message: hasSuccessResponse ? 'Success response (201) present' : 'Success response missing',
  });

  // Check for error response structure
  const hasErrorResponse = /status.*500|status.*400|status.*403/.test(fileContent);
  results.push({
    check: 'Error response structure',
    passed: hasErrorResponse,
    message: hasErrorResponse ? 'Error responses present' : 'Error responses missing',
  });

  return results;
}

// Run validation
const results = validateProductAPI();

// Display results
console.log('\n📊 Validation Results:');
console.log('====================\n');

results.forEach((result, index) => {
  const icon = result.passed ? '✅' : '❌';
  console.log(`${icon} [${index + 1}] ${result.check}`);
  console.log(`   ${result.message}\n`);
});

// Summary
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log('\n📈 Summary:');
console.log(`   ✅ Passed: ${passed}/${total}`);
console.log(`   ❌ Failed: ${failed}/${total}`);
console.log(`   📊 Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

if (failed === 0) {
  console.log('🎉 All validations passed! The API route structure looks good.\n');
  process.exit(0);
} else {
  console.log('⚠️  Some validations failed. Please review the issues above.\n');
  process.exit(1);
}
