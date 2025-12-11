# Testing Guide

This directory contains all tests for the StoreFlow application.

## Test Structure

```
tests/
├── unit/              # Unit tests for utilities and helpers
├── integration/       # Integration tests for API routes
├── e2e/              # End-to-end tests with Playwright
├── rls/              # Row-Level Security policy tests
├── performance/      # Performance and load tests
├── security/        # Security audit tests
└── helpers/          # Test utilities and mocks
```

## Running Tests

### Unit Tests
```bash
npm run test              # Run all unit tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report
```

### E2E Tests
```bash
# First time setup: Install Playwright browsers
npm run playwright:install

# Run E2E tests
npm run test:e2e         # Run all E2E tests (Chromium by default)
npm run test:e2e:ui      # Run E2E tests with UI mode
npm run test:e2e:chromium # Run only Chromium tests (faster)
```

### All Tests
```bash
npm run test:all         # Run both unit and E2E tests
```

## Test Status

### ✅ Passing Tests (28 tests)
- **Unit Tests**: All utility functions tested
  - `cn` utility (class name merging)
  - `subdomain-validation` (validation logic)
  - `stock-calculator` (stock calculations)
- **Security Tests**: Authentication/authorization checks

### ⏭️ Skipped Tests (15 tests - require database)
- **Integration Tests**: API route tests (require database connection)
- **RLS Tests**: Tenant isolation tests (require database)
- **Performance Tests**: API performance benchmarks (require database)
- **Security Tests**: Some security checks (require database)

**Note**: Database-dependent tests are automatically skipped when no database connection is available. This is expected behavior for local development without a test database.

## Test Coverage Goals

- **Unit Tests**: 70%+ coverage for utility functions ✅
- **Integration Tests**: All API routes tested (requires DB)
- **E2E Tests**: Critical user flows (tenant creation, checkout, etc.)
- **RLS Tests**: All tenant isolation scenarios (requires DB)
- **Performance Tests**: Response times < 200ms for API routes (requires DB)

## Writing Tests

### Unit Test Example
```typescript
import { formatCurrency } from '@/lib/utils/currency';

describe('formatCurrency', () => {
  it('should format USD correctly', () => {
    expect(formatCurrency(100, 'USD')).toBe('$100.00');
  });
});
```

### Integration Test Example
```typescript
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/products/route';

describe('/api/products', () => {
  it('should return products for tenant', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: { 'x-tenant-id': 'test-tenant-id' },
    });
    
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
  });
});
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';

test('should create a tenant', async ({ page }) => {
  await page.goto('/admin/tenants/new');
  await page.fill('input[name="subdomain"]', 'teststore');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin\/tenants/);
});
```

## Test Environment

### Environment Variables

Tests use mock environment variables defined in `jest.setup.js`. For database-dependent tests, you'll need:

```env
# Test Database
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/test_db

# Test Supabase (optional - tests will skip if not available)
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
```

### Database Setup

For integration and RLS tests:
1. Set up a test database (separate from production)
2. Run migrations on test database
3. Tests will automatically connect if `TEST_DATABASE_URL` is set

## Expected Console Output

When running tests without a database, you may see:
- ⚠️ Warnings about database not being available (expected)
- Console errors for network requests (expected - services are mocked)
- These are suppressed in the test output but may appear in logs

**This is normal behavior** - tests that require a database are automatically skipped.

## Test Data

- Use factories for creating test data
- Clean up test data after each test
- Use test database for integration tests
- Mock external services (SendGrid, Vercel API, etc.)

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Before deployment
- Nightly builds

Add to GitHub Actions or Vercel:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test
      - run: npm run test:e2e
```

## Troubleshooting

### Tests failing with "Database not available"
- **Solution**: This is expected. Tests that require a database are automatically skipped.
- To run database tests: Set up a test database and configure `TEST_DATABASE_URL`

### Network request errors in console
- **Solution**: These are expected. External services (Supabase, KV) are mocked in tests.
- Errors are suppressed in test output but may appear in logs.

### "Request is not defined" errors
- **Solution**: Already fixed. Web API mocks are set up in `jest.setup.js`

---

**Last Updated**: Day 41-43 Testing Implementation
**Status**: ✅ All unit tests passing, database tests properly skipped
