# Creating Pricing Plans with Trial Periods

This guide explains how to create three pricing plans with 14-day trial periods.

## Step 1: Add trial_days Column to Database

First, you need to add the `trial_days` column to the `price_plans` table.

### Option A: Using Prisma (Recommended)

```bash
cd storeflow
npx prisma db push
```

This will sync the schema changes (trial_days field) to your database.

### Option B: Using SQL Directly

Run the SQL migration file in your Supabase SQL editor:

```sql
-- File: storeflow/supabase/migrations/add_trial_days_to_price_plans.sql
ALTER TABLE price_plans 
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0;
```

## Step 2: Create the Three Pricing Plans

### Option A: Using TypeScript Script

```bash
cd storeflow
npx tsx scripts/create-pricing-plans.ts
```

### Option B: Using SQL Directly

Run the SQL script in your Supabase SQL editor:

```sql
-- File: storeflow/scripts/create-pricing-plans.sql
-- This will create:
-- 1. Basic Plan - $29.99/month - 14-day trial
-- 2. Pro Plan - $79.99/month - 14-day trial
-- 3. Enterprise Plan - $199.99/month - 14-day trial
```

### Option C: Using API Endpoints

You can also create plans via the API using Postman or curl:

```bash
# Create Basic Plan
curl -X POST http://localhost:3000/api/admin/price-plans \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "name": "Basic Plan",
    "price": 29.99,
    "duration_months": 1,
    "trial_days": 14,
    "features": {
      "max_products": 100,
      "max_orders": 500,
      "max_storage_mb": 1024,
      "max_customers": 1000,
      "max_pages": 10,
      "max_blogs": 20,
      "max_staff_users": 2
    },
    "status": "active"
  }'
```

## Plans Overview

### 1. Basic Plan
- **Price:** $29.99/month
- **Trial:** 14 days
- **Features:**
  - 100 Products
  - 500 Orders
  - 1 GB Storage
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
  - 10 GB Storage
  - 10,000 Customers
  - 50 Pages
  - 100 Blog Posts
  - 10 Staff Users

### 3. Enterprise Plan
- **Price:** $199.99/month
- **Trial:** 14 days
- **Features:**
  - Unlimited Products
  - Unlimited Orders
  - 100 GB Storage
  - Unlimited Customers
  - Unlimited Pages
  - Unlimited Blog Posts
  - Unlimited Staff Users

## How Trial Periods Work

1. **When a tenant is created with a plan that has `trial_days > 0`:**
   - The `expire_date` is set to `start_date + trial_days` (instead of `start_date + duration_months`)
   - Tenant status is set to `active`
   - After trial expires, tenant status changes to `expired` (grace period) or `suspended`

2. **Trial Period Display:**
   - Plans with trial periods show a "14-day free trial" badge
   - Subscription page shows trial expiration date
   - Renewal reminders are sent before trial expires

3. **After Trial:**
   - Tenant needs to subscribe to continue
   - Subscription expiry checker will mark trial as expired
   - Email notifications are sent when trial expires

## Verification

After creating the plans, verify they exist:

```sql
SELECT id, name, price, duration_months, trial_days, status 
FROM price_plans 
WHERE name IN ('Basic Plan', 'Pro Plan', 'Enterprise Plan')
ORDER BY price ASC;
```

Or use the API:

```bash
GET /api/admin/price-plans
```

