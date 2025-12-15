/**
 * Production Smoke Tests
 * 
 * This script runs basic smoke tests to verify production deployment is working.
 * 
 * Usage:
 *   tsx scripts/smoke-tests.ts [production-url]
 * 
 * Example:
 *   tsx scripts/smoke-tests.ts https://www.dukanest.com
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const PRODUCTION_URL = process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || 'https://www.dukanest.com';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

async function testEndpoint(name: string, url: string, expectedStatus: number = 200): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'StoreFlow-SmokeTests/1.0',
      },
    });

    const duration = Date.now() - startTime;
    const passed = response.status === expectedStatus;

    if (!passed) {
      return {
        name,
        passed: false,
        error: `Expected status ${expectedStatus}, got ${response.status}`,
        duration,
      };
    }

    return {
      name,
      passed: true,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration,
    };
  }
}

async function testHomepage() {
  console.log('🏠 Testing homepage...');
  const result = await testEndpoint('Homepage', PRODUCTION_URL);
  results.push(result);
  return result;
}

async function testAPIHealth() {
  console.log('💚 Testing API health endpoint...');
  const result = await testEndpoint('API Health', `${PRODUCTION_URL}/api/health`, 200);
  results.push(result);
  return result;
}

async function testTenantAPI() {
  console.log('🏪 Testing tenant API...');
  const result = await testEndpoint('Tenant API', `${PRODUCTION_URL}/api/tenant/current`, 200);
  results.push(result);
  return result;
}

async function testSubdomainRouting() {
  console.log('🌐 Testing subdomain routing...');
  
  // Test with a test subdomain
  const testSubdomain = 'test-deployment';
  const subdomainUrl = PRODUCTION_URL.replace('www.', `${testSubdomain}.`).replace('dukanest.com', 'dukanest.com');
  
  const result = await testEndpoint('Subdomain Routing', subdomainUrl, 200);
  results.push(result);
  return result;
}

async function testSSL() {
  console.log('🔒 Testing SSL certificate...');
  
  try {
    const url = new URL(PRODUCTION_URL);
    const response = await fetch(PRODUCTION_URL, {
      method: 'HEAD',
    });

    const isHttps = url.protocol === 'https:';
    const hasValidSSL = response.ok && isHttps;

    results.push({
      name: 'SSL Certificate',
      passed: hasValidSSL,
      error: !isHttps ? 'Not using HTTPS' : !response.ok ? 'SSL verification failed' : undefined,
    });

    return results[results.length - 1];
  } catch (error) {
    results.push({
      name: 'SSL Certificate',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    return results[results.length - 1];
  }
}

async function testHTTPSRedirect() {
  console.log('🔄 Testing HTTPS redirect...');
  
  try {
    const httpUrl = PRODUCTION_URL.replace('https://', 'http://');
    const response = await fetch(httpUrl, {
      method: 'GET',
      redirect: 'manual',
    });

    const redirectsToHttps = response.status === 301 || response.status === 302;
    const location = response.headers.get('location');
    const correctRedirect = location?.startsWith('https://');

    results.push({
      name: 'HTTPS Redirect',
      passed: redirectsToHttps && correctRedirect === true,
      error: !redirectsToHttps ? 'No redirect from HTTP' : !correctRedirect ? 'Redirects to wrong URL' : undefined,
    });

    return results[results.length - 1];
  } catch (error) {
    results.push({
      name: 'HTTPS Redirect',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    return results[results.length - 1];
  }
}

async function main() {
  console.log('🚀 Production Smoke Tests\n');
  console.log(`📍 Testing: ${PRODUCTION_URL}\n`);
  console.log('='.repeat(60) + '\n');

  try {
    // Run all tests
    await testHomepage();
    await testAPIHealth();
    await testTenantAPI();
    await testSubdomainRouting();
    await testSSL();
    await testHTTPSRedirect();

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results:\n');

    let passedCount = 0;
    let failedCount = 0;

    results.forEach((result) => {
      const icon = result.passed ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      console.log(`${icon} ${result.name}${duration}`);
      
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }

      if (result.passed) {
        passedCount++;
      } else {
        failedCount++;
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Passed: ${passedCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    console.log(`📊 Total: ${results.length}\n`);

    if (failedCount > 0) {
      console.log('⚠️  Some tests failed. Please review the errors above.\n');
      process.exit(1);
    } else {
      console.log('🎉 All smoke tests passed!\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Error running smoke tests:', error);
    process.exit(1);
  }
}

main();
