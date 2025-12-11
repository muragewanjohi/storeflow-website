# E2E Test Setup Guide

## Why Tests Are Skipped

The E2E tests are currently skipped because they require test credentials to run. This is by design to prevent tests from failing when credentials aren't configured.

## Quick Setup

### 1. Create `.env.test` File

Create a `.env.test` file in the project root:

```env
# For tenant creation tests (admin/landlord login)
TEST_LANDLORD_EMAIL=admin@test.com
TEST_LANDLORD_PASSWORD=your-actual-password

# For checkout flow tests (tenant storefront)
TEST_TENANT_SUBDOMAIN=teststore
```

### 2. Get Test Credentials

**For Tenant Creation Tests:**
- You need an admin/landlord account in your database
- Use the email and password of an existing landlord user
- Or create a test landlord account specifically for testing

**For Checkout Flow Tests:**
- You need an existing tenant subdomain
- Use a subdomain of an existing tenant (e.g., `myduka` if tenant is at `myduka.dukanest.com`)
- Or create a test tenant first

### 3. Run Tests

```bash
# Tests will now run instead of being skipped
npm run test:e2e:chromium
```

## Creating Test Credentials

### Option 1: Use Existing Credentials

If you already have a landlord account and tenant:
1. Use those credentials in `.env.test`
2. Tests will use your existing data

### Option 2: Create Test Credentials

**Create Test Landlord:**
1. Sign up at `/admin/register` or create via database
2. Use those credentials in `.env.test`

**Create Test Tenant:**
1. Login as landlord
2. Create a new tenant at `/admin/tenants/new`
3. Use that tenant's subdomain in `.env.test`

## Test Behavior

### When Credentials Are Set ✅
- Tests will run and interact with your application
- Tests will create/modify data (use test database if possible)
- Tests will verify actual functionality

### When Credentials Are NOT Set ⏭️
- Tests are automatically skipped
- No errors or failures
- Clear skip messages explain what's missing

## Security Note

⚠️ **Important**: 
- Never commit `.env.test` to version control
- Use test/demo credentials, not production credentials
- Consider using a separate test database for E2E tests

## Troubleshooting

### Tests Still Skipped After Setting Variables

1. **Check file location**: `.env.test` should be in project root (same level as `package.json`)
2. **Check variable names**: Must be exactly `TEST_LANDLORD_EMAIL`, `TEST_LANDLORD_PASSWORD`, `TEST_TENANT_SUBDOMAIN`
3. **Restart test run**: Environment variables are loaded at test start

### Tests Fail with Authentication Errors

1. **Verify credentials**: Make sure email/password are correct
2. **Check database**: Ensure the landlord account exists
3. **Check tenant**: Ensure the tenant subdomain exists and is active

### Tests Fail with Timeout Errors

1. **Check dev server**: Make sure `npm run dev` works
2. **Check base URL**: Default is `http://localhost:3000`
3. **Increase timeout**: Tests have 10s timeout, you can increase in test files

## Example `.env.test`

```env
# Admin/Landlord credentials for tenant creation tests
TEST_LANDLORD_EMAIL=admin@dukanest.com
TEST_LANDLORD_PASSWORD=SecurePassword123!

# Existing tenant subdomain for checkout tests
TEST_TENANT_SUBDOMAIN=myduka

# Optional: Override base URL
# PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
```

## Next Steps

Once credentials are set:
1. Run `npm run test:e2e:chromium` to verify tests run
2. Check test output for any failures
3. Adjust test selectors if UI has changed
4. Add more test scenarios as needed

