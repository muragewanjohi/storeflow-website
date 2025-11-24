# Create Pricing Plans via API

## Quick Start: Create Three Plans with 14-Day Trials

### Prerequisites

1. **Add trial_days column to database:**
   ```sql
   -- Run in Supabase SQL Editor
   ALTER TABLE price_plans 
   ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0;
   ```

2. **Or use Prisma:**
   ```bash
   cd storeflow
   # Stop your dev server first if running
   npx prisma db push
   npx prisma generate
   ```

### Create Plans via API

Use Postman or curl to create the three plans:

#### 1. Basic Plan

```bash
POST /api/admin/price-plans
Content-Type: application/json

{
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
}
```

#### 2. Pro Plan

```bash
POST /api/admin/price-plans
Content-Type: application/json

{
  "name": "Pro Plan",
  "price": 79.99,
  "duration_months": 1,
  "trial_days": 14,
  "features": {
    "max_products": 1000,
    "max_orders": 5000,
    "max_storage_mb": 10240,
    "max_customers": 10000,
    "max_pages": 50,
    "max_blogs": 100,
    "max_staff_users": 10
  },
  "status": "active"
}
```

#### 3. Enterprise Plan

```bash
POST /api/admin/price-plans
Content-Type: application/json

{
  "name": "Enterprise Plan",
  "price": 199.99,
  "duration_months": 1,
  "trial_days": 14,
  "features": {
    "max_products": -1,
    "max_orders": -1,
    "max_storage_mb": 102400,
    "max_customers": -1,
    "max_pages": -1,
    "max_blogs": -1,
    "max_staff_users": -1
  },
  "status": "active"
}
```

### Verify Plans

```bash
GET /api/admin/price-plans
```

You should see all three plans with `trial_days: 14`.

