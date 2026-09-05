# Delivery Zones Migration Guide

## Quick Migration (Recommended)

If Prisma migrations are slow, you can run the SQL migration directly in Supabase:

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**

### Step 2: Run the Migration SQL

Copy and paste the contents of `prisma/migrations/manual_add_delivery_zones.sql` into the SQL editor and click **Run**.

### Step 3: Verify Migration

After running, you should see:
- ✅ `delivery_zones` table created
- ✅ New columns added to `orders` table
- ✅ Indexes created
- ✅ Foreign key constraints added

### Step 4: Regenerate Prisma Client

After the SQL migration completes, regenerate Prisma client:

```bash
npm run db:generate
```

## Alternative: Using Prisma Migrate (If Network is Fast)

If you prefer to use Prisma migrations (creates migration history):

```bash
# This may take a while if network is slow
npx prisma migrate dev --name add_delivery_zones
```

## Alternative: Using Prisma DB Push (Faster, No History)

For development, you can use `db:push` which is faster but doesn't create migration files:

```bash
npm run db:push
```

## Troubleshooting

### Migration Taking Too Long

If Prisma commands are slow:
1. **Use SQL Editor** - Run the SQL directly in Supabase (fastest)
2. **Check Network** - Ensure stable connection to Supabase
3. **Check Database** - Verify Supabase project is accessible

### After Manual SQL Migration

After running SQL manually:
1. Regenerate Prisma client: `npm run db:generate`
2. Restart your dev server: `npm run dev`
3. Test the delivery zones feature

## Verification

To verify the migration worked:

```sql
-- Check delivery_zones table
SELECT * FROM delivery_zones LIMIT 1;

-- Check orders table columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name LIKE 'delivery%';
```

## Rollback (If Needed)

If you need to rollback:

```sql
-- Remove foreign key constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_delivery_zone;

-- Remove columns from orders
ALTER TABLE orders 
  DROP COLUMN IF EXISTS delivery_zone_id,
  DROP COLUMN IF EXISTS delivery_zone_name,
  DROP COLUMN IF EXISTS delivery_fee,
  DROP COLUMN IF EXISTS delivery_fee_status,
  DROP COLUMN IF EXISTS delivery_fee_quote,
  DROP COLUMN IF EXISTS delivery_fee_notes;

-- Drop delivery_zones table
DROP TABLE IF EXISTS delivery_zones;
```
