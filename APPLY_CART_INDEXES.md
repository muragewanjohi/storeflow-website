# Apply Cart Performance Indexes

## Option 1: Using Prisma DB Push (Recommended)

When your database connection is available, run:

```bash
cd storeflow
npx prisma db push
```

This will sync your schema and add the new indexes without dealing with migration history.

## Option 2: Manual SQL Migration

If you prefer to use migrations, apply this SQL directly in your Supabase SQL Editor:

```sql
-- Add performance indexes for cart_items table
CREATE INDEX IF NOT EXISTS "idx_cart_items_tenant_user" ON "cart_items"("tenant_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_cart_items_product_id" ON "cart_items"("product_id");
```

## Option 3: Resolve Migration History (Advanced)

If you want to properly sync migration history:

1. First, create a baseline migration:
```bash
npx prisma migrate dev --create-only --name baseline
```

2. Mark it as applied (since database already has the schema):
```bash
npx prisma migrate resolve --applied baseline
```

3. Then create the new migration:
```bash
npx prisma migrate dev --name add_cart_performance_indexes
```

## What These Indexes Do

- `idx_cart_items_tenant_user`: Speeds up queries that filter by both tenant_id and user_id (most cart queries)
- `idx_cart_items_product_id`: Speeds up lookups when finding cart items by product_id

These indexes will significantly improve cart update performance.

