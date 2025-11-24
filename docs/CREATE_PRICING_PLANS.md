# Create Three Pricing Plans with 14-Day Trial Periods

This guide explains how to create three pricing plans (Basic, Pro, Enterprise) each with a 14-day free trial period.

## Step 1: Add `trial_days` Column to Database

The `price_plans` table needs a `trial_days` column to support trial periods.

### Option A: Using Prisma (Recommended)

```bash
cd storeflow

# Stop your dev server if running (Ctrl+C)

# Push schema changes to database
npx prisma db push

# Regenerate Prisma client
npx prisma generate
```

### Option B: Using SQL Directly

Run this SQL in your Supabase SQL Editor:

```sql
ALTER TABLE price_plans 
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0;

COMMENT ON COLUMN price_plans.trial_days IS 'Trial period in days (0 = no trial)';
```

## Step 2: Create the Three Pricing Plans

### Option A: Using TypeScript Script (Recommended)

```bash
cd storeflow
npx tsx scripts/create-pricing-plans.ts
```

### Option B: Using JavaScript Script

```bash
cd storeflow
node scripts/create-pricing-plans-simple.js
```

### Option C: Using SQL Directly

Run the SQL script in Supabase SQL Editor:

```sql
-- File: storeflow/scripts/create-pricing-plans.sql
-- Copy and paste the entire SQL file content
```

### Option D: Using API (Postman/curl)

See `storeflow/scripts/create-pricing-plans-api.md` for detailed API requests.

## Plans Overview

### 1. Basic Plan
- **Price:** $29.99/month
- **Trial:** 14 days
- **Features:**
  - 100 Products
  - 500 Orders
  - 1 GB Storage (1,024 MB)
  - 1,000 Customers
  - 10 Pages
  - 20 Blog Posts
  - 2 Staff Users

### 2. Pro Plan
- **Price:** $79.99/month
- **Trial:** 14 days
- **Features:**
  - 1,000 Products
  - 5,000 Orders
  - 10 GB Storage (10,240 MB)
  - 10,000 Customers
  - 50 Pages
  - 100 Blog Posts
  - 10 Staff Users

### 3. Enterprise Plan
- **Price:** $199.99/month
- **Trial:** 14 days
- **Features:**
  - Unlimited Products (-1)
  - Unlimited Orders (-1)
  - 100 GB Storage (102,400 MB)
  - Unlimited Customers (-1)
  - Unlimited Pages (-1)
  - Unlimited Blog Posts (-1)
  - Unlimited Staff Users (-1)

## How Trial Periods Work

### When Tenant is Created

1. **If plan has `trial_days > 0`:**
   - `expire_date` = `start_date + trial_days` (14 days from creation)
   - Tenant status = `active`
   - Tenant can use all plan features during trial

2. **After Trial Expires:**
   - Tenant status changes to `expired` (grace period)
   - After grace period (7 days), status changes to `suspended`
   - Email notifications are sent when trial expires

### Display in UI

- **Subscription Page:**
  - Shows "Trial Expires" instead of "Renewal Date" during trial
  - Displays trial countdown badge
  - Blue warning banner when trial is ending soon
  - Plan cards show "14-day free trial" badge

- **Plan Cards:**
  - All plans with `trial_days > 0` show a green "X-day free trial" badge
  - Helps users identify which plans offer trials

## Verification

### Check Plans via API

```bash
GET /api/admin/price-plans
```

Response should include all three plans with `trial_days: 14`.

### Check Plans via SQL

```sql
SELECT id, name, price, duration_months, trial_days, status 
FROM price_plans 
WHERE name IN ('Basic Plan', 'Pro Plan', 'Enterprise Plan')
ORDER BY price ASC;
```

### Test Trial Period

1. Create a new tenant with one of the plans
2. Check `expire_date` - should be 14 days from `created_at`
3. Visit tenant subscription page - should show trial countdown
4. Wait for trial to expire - should receive email notification

## Troubleshooting

### Error: "trial_days column does not exist"

**Solution:** Run Step 1 to add the column first.

### Error: "EPERM: operation not permitted" when running prisma generate

**Solution:** 
1. Stop your dev server (Ctrl+C)
2. Close any other processes using Prisma client
3. Run `npx prisma generate` again

### Plans already exist

**Solution:** 
- Delete existing plans first, OR
- Modify script to use different plan names, OR
- Update existing plans via API

## Files Modified

- `storeflow/prisma/schema.prisma` - Added `trial_days` field
- `storeflow/src/lib/subscriptions/validation.ts` - Added `trial_days` validation
- `storeflow/src/app/api/admin/price-plans/route.ts` - Include `trial_days` in responses
- `storeflow/src/app/api/admin/tenants/route.ts` - Calculate trial expiry date
- `storeflow/src/app/dashboard/subscription/tenant-subscription-client.tsx` - Display trial information

## Next Steps

After creating the plans:

1. ✅ Verify plans exist: `GET /api/admin/price-plans`
2. ✅ Create a test tenant with a plan to see trial in action
3. ✅ Check subscription page shows trial countdown
4. ✅ Test trial expiry notifications

---

**Last Updated:** 2024

