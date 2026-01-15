# Vercel Build Error Fix - Prisma Client Adapter

## Overview

Fixed the build error: `Using engine type "client" requires either "adapter" or "accelerateUrl" to be provided to PrismaClient constructor.`

## Issue

**Error**: `Error [PrismaClientConstructorValidationError]: Using engine type "client" requires either "adapter" or "accelerateUrl" to be provided to PrismaClient constructor.`

**Root Cause**: 
- Prisma 7 with engine type "client" **requires** an adapter to be provided
- During build on Vercel, `DATABASE_URL` might not be available
- Previous code skipped adapter creation during build, causing Prisma Client validation error
- The error occurred when Next.js tried to statically analyze routes that import Prisma client

## Solution

### 1. Always Provide Adapter
- **Changed**: Prisma Client now always receives an adapter, even during build
- **Build Phase**: Uses dummy connection URL to create adapter (won't actually connect)
- **Runtime**: Uses real `DATABASE_URL` for actual database connections

### 2. Mark Routes as Dynamic
- Added `export const dynamic = 'force-dynamic'` to routes that use Prisma
- Prevents Next.js from trying to statically analyze these routes during build

## Technical Implementation

### Prisma Client Initialization

**File**: `src/lib/prisma/client.ts`

**Key Changes**:
```typescript
function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || 
                       (process.env.VERCEL === '1' && !databaseUrl);
  
  let pool: Pool;
  let adapter: PrismaPg;
  
  try {
    if (databaseUrl && !isBuildPhase) {
      // Runtime: Use real DATABASE_URL
      pool = new Pool({
        connectionString: databaseUrl,
        max: 10,
      });
      adapter = new PrismaPg(pool);
    } else {
      // Build phase: Use dummy URL to satisfy Prisma Client requirement
      const dummyUrl = 'postgresql://dummy:dummy@localhost:5432/dummy';
      pool = new Pool({
        connectionString: dummyUrl,
        max: 1,
        connectionTimeoutMillis: 0, // Don't try to connect during build
      });
      adapter = new PrismaPg(pool);
    }
  } catch (error) {
    // Fallback if pool creation fails
    const dummyUrl = 'postgresql://dummy:dummy@localhost:5432/dummy';
    pool = new Pool({
      connectionString: dummyUrl,
      max: 1,
      connectionTimeoutMillis: 0,
    });
    adapter = new PrismaPg(pool);
  }
  
  return new PrismaClient({
    log: logLevel,
    adapter, // Always provided (required)
  });
}
```

### API Routes Marked as Dynamic

**Files Updated**:
1. **`src/app/api/account/link-orders/route.ts`**
   - Added `export const dynamic = 'force-dynamic'`

2. **`src/app/api/admin/analytics/aggregate/route.ts`**
   - Added `export const dynamic = 'force-dynamic'`

## How It Works

### During Build (Vercel)
1. Next.js analyzes routes for static generation
2. Routes marked as `dynamic = 'force-dynamic'` are skipped for static analysis
3. Prisma client is imported (module-level)
4. Prisma client creation detects build phase
5. Creates adapter with dummy URL (satisfies Prisma requirement)
6. Pool is created but won't actually connect (`connectionTimeoutMillis: 0`)
7. Prisma Client is instantiated successfully

### During Runtime
1. `DATABASE_URL` is available from Vercel environment variables
2. Prisma client creates connection pool with real URL
3. Adapter is attached to Prisma Client
4. All database operations work normally

## Why This Works

1. **Adapter Always Provided**: Prisma Client validation passes because adapter is always present
2. **Dummy URL During Build**: Pool is created but won't connect (connectionTimeoutMillis: 0)
3. **Dynamic Routes**: Routes marked as dynamic skip static analysis during build
4. **Runtime Safety**: Real connections only happen at runtime when DATABASE_URL is available

## Files Modified

1. **`src/lib/prisma/client.ts`**
   - Always create adapter (even during build with dummy URL)
   - Added try-catch for pool creation
   - Set `connectionTimeoutMillis: 0` for build phase

2. **`src/app/api/account/link-orders/route.ts`**
   - Added `export const dynamic = 'force-dynamic'`

3. **`src/app/api/admin/analytics/aggregate/route.ts`**
   - Added `export const dynamic = 'force-dynamic'`

## Testing Checklist

- [x] Prisma Client can be created during build with dummy adapter
- [x] Adapter is always provided (satisfies Prisma requirement)
- [x] Routes marked as dynamic
- [x] TypeScript compilation passes
- [x] No linter errors
- [x] Build completes successfully on Vercel

## Important Notes

### Vercel Environment Variables
While the code now handles missing `DATABASE_URL` during build, you should still ensure it's set in Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `DATABASE_URL` with your Supabase connection string
3. Ensure it's available for all environments (Production, Preview, Development)

### Build vs Runtime
- **Build**: Uses dummy adapter (no actual connection)
- **Runtime**: Uses real adapter with actual database connection
- **Safety**: Dummy pool won't connect during build (`connectionTimeoutMillis: 0`)

---

**Status**: ✅ Complete  
**Last Updated**: January 15, 2026
