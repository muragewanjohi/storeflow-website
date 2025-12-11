# E2E Tests Quick Start

## Current Status: Tests Skipped ⏭️

The 5 E2E tests are currently **skipped** because test credentials are not configured. This is **expected behavior**.

## Enable Tests in 3 Steps

### Step 1: Create `.env.test` File

Create a file named `.env.test` in the project root (`storeflow/.env.test`):

```env
TEST_LANDLORD_EMAIL=your-admin-email@example.com
TEST_LANDLORD_PASSWORD=your-admin-password
TEST_TENANT_SUBDOMAIN=your-tenant-subdomain
```

### Step 2: Get Your Credentials

- **TEST_LANDLORD_EMAIL/PASSWORD**: Use your landlord/admin account credentials
- **TEST_TENANT_SUBDOMAIN**: Use an existing tenant's subdomain (e.g., `myduka`)

### Step 3: Run Tests

```bash
npm run test:e2e:chromium
```

Tests will now **run** instead of being skipped! 🎉

## What Each Test Does

1. **Tenant Creation** (3 tests)
   - Creates a new tenant
   - Validates subdomain format
   - Prevents duplicate subdomains

2. **Checkout Flow** (2 tests)
   - Completes checkout process
   - Validates required fields

## Need Help?

See [SETUP.md](./SETUP.md) for detailed setup instructions and troubleshooting.

