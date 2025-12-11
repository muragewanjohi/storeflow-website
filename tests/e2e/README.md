# E2E Tests Setup Guide

## Prerequisites

1. **Install Playwright Browsers** ✅ (Already done)
   ```bash
   npm run playwright:install
   # or
   npx playwright install
   ```

2. **Set Up Test Environment Variables** ⚠️ (Required to run tests)
   
   **Create `.env.test` file in project root:**
   ```env
   # For tenant creation tests (admin/landlord login)
   TEST_LANDLORD_EMAIL=admin@test.com
   TEST_LANDLORD_PASSWORD=your-actual-password

   # For checkout flow tests (tenant storefront)
   TEST_TENANT_SUBDOMAIN=teststore
   ```
   
   **Note**: Tests are currently skipped because these variables aren't set. See [SETUP.md](./SETUP.md) for detailed instructions.

3. **Start Development Server**
   
   E2E tests will automatically start the dev server, but you can also run it manually:
   ```bash
   npm run dev
   ```

## Running E2E Tests

```bash
# Run all E2E tests (Chromium by default)
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run only Chromium tests (faster)
npm run test:e2e:chromium

# Run specific test file
npx playwright test tests/e2e/tenant-creation.spec.ts
```

## Test Files

- **`tenant-creation.spec.ts`**: Tests tenant creation flow
  - Creates new tenant
  - Validates subdomain format
  - Prevents duplicate subdomains

- **`checkout-flow.spec.ts`**: Tests checkout process
  - Completes checkout flow
  - Validates required fields

## Writing New E2E Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/path');
    await page.fill('input[name="field"]', 'value');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/success/);
  });
});
```

### Best Practices

1. **Use descriptive test names**: Clearly describe what the test does
2. **Set up prerequisites**: Use `beforeEach` for common setup
3. **Clean up after tests**: Use `afterEach` if needed
4. **Wait for elements**: Use `waitFor` or `waitForURL` instead of fixed timeouts
5. **Use data-testid**: Add `data-testid` attributes to important elements for reliable selectors
6. **Skip tests conditionally**: Use `test.skip()` for tests that require specific conditions

### Example with Conditional Skipping

```typescript
test('should work with feature flag', async ({ page }) => {
  test.skip(
    !process.env.FEATURE_FLAG_ENABLED,
    'Feature flag not enabled'
  );
  
  // Test code here
});
```

## Debugging E2E Tests

### Run in UI Mode
```bash
npm run test:e2e:ui
```

### Run in Debug Mode
```bash
npx playwright test --debug
```

### Run with Headed Browser
```bash
npx playwright test --headed
```

### Generate Code from Actions
```bash
npx playwright codegen http://localhost:3000
```

## CI/CD Integration

For CI/CD, you may want to:
1. Install only Chromium (faster):
   ```bash
   npx playwright install chromium
   ```

2. Run tests in headless mode (default)

3. Set up test environment variables in CI/CD secrets

## Troubleshooting

### Browsers not installed
**Error**: `Executable doesn't exist`
**Solution**: Run `npm run playwright:install`

### Tests timing out
**Solution**: Increase timeout in test or check if dev server is running

### Selectors not found
**Solution**: 
- Use `data-testid` attributes
- Wait for elements: `await page.waitForSelector('selector')`
- Check if page loaded: `await page.waitForLoadState('networkidle')`

### Authentication issues
**Solution**: Ensure test credentials are set in environment variables

