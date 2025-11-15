# StoreFlow Security Documentation

**Row-Level Security (RLS) Implementation Guide**

---

## 🔒 Overview

StoreFlow uses **Row-Level Security (RLS)** to ensure automatic tenant data isolation at the database level. This provides a robust security layer that cannot be bypassed, even if application code has bugs.

---

## 🎯 What is Row-Level Security (RLS)?

**Row-Level Security** is a PostgreSQL feature that automatically filters database queries based on policies. In StoreFlow, RLS ensures that:

- ✅ Each tenant can only access their own data
- ✅ Queries are automatically filtered by `tenant_id`
- ✅ Security is enforced at the database level (cannot be bypassed)
- ✅ No need to manually add `WHERE tenant_id = ?` to every query

---

## 🏗️ How RLS Works in StoreFlow

### Architecture

```
┌─────────────────────────────────────────┐
│      Next.js Application                 │
│                                          │
│  1. Resolve tenant from hostname         │
│  2. Set tenant context                   │
│  3. Query database                       │
└──────────────┬──────────────────────────┘
               │
               │ SQL Query
               │
┌──────────────▼──────────────────────────┐
│      Supabase PostgreSQL                 │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │  RLS Policy                      │  │
│  │  USING (tenant_id = context)     │  │
│  └──────────────────────────────────┘  │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │  Filtered Results                │  │
│  │  (Only current tenant's data)    │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Flow

1. **Request arrives** → `tenant1.dukanest.com`
2. **Middleware resolves tenant** → Gets tenant UUID
3. **Set tenant context** → Calls `set_tenant_context(tenant_id)`
4. **Query database** → RLS automatically filters by tenant_id
5. **Return results** → Only current tenant's data

---

## 📋 RLS Implementation

### 1. PostgreSQL Function: `set_tenant_context()`

This function stores the current tenant_id in the PostgreSQL session:

```sql
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::text, true);
END;
$$;
```

**Usage:**
```typescript
await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
```

### 2. Enable RLS on Tables

RLS must be enabled on all tenant-scoped tables:

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ... all tenant-scoped tables
```

### 3. Create RLS Policies

Each tenant-scoped table has a policy that filters by tenant_id:

```sql
CREATE POLICY "products_tenant_isolation"
  ON products
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
```

**What this does:**
- `FOR ALL` - Applies to SELECT, INSERT, UPDATE, DELETE
- `USING` - Filter condition (only show rows where tenant_id matches)
- `current_setting('app.current_tenant_id')` - Gets tenant_id from session

---

## 🔧 Using RLS in Code

### Server-Side (API Routes, Server Components)

**Option 1: Using Supabase Client with Tenant Context**

```typescript
import { createTenantServerClient } from '@/lib/supabase/server-with-tenant';
import { getTenantFromRequest } from '@/lib/tenant-context';

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const tenant = await getTenantFromRequest(hostname);

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // Create client with tenant context (automatically sets RLS context)
  const supabase = await createTenantServerClient(tenant.id);

  // RLS automatically filters by tenant_id
  const { data: products } = await supabase
    .from('products')
    .select('*');
  // Only returns products for current tenant

  return NextResponse.json({ products });
}
```

**Option 2: Using Prisma with Explicit tenant_id**

```typescript
import { prisma } from '@/lib/prisma/client';
import { getTenantFromRequest } from '@/lib/tenant-context';

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const tenant = await getTenantFromRequest(hostname);

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // Set RLS context (optional but recommended)
  await setTenantContext(tenant.id);

  // Prisma query - RLS filters automatically
  const products = await prisma.products.findMany({
    where: {
      tenant_id: tenant.id, // Explicit tenant_id (required for Prisma)
      status: 'active'
    }
  });

  return NextResponse.json({ products });
}
```

### Client-Side (React Components)

```typescript
'use client';

import { createTenantSupabaseClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export function ProductsList({ tenantId }: { tenantId: string }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    async function fetchProducts() {
      // Create client with tenant context
      const supabase = await createTenantSupabaseClient(tenantId);

      // RLS automatically filters
      const { data } = await supabase
        .from('products')
        .select('*');

      setProducts(data || []);
    }

    fetchProducts();
  }, [tenantId]);

  return <div>{/* Render products */}</div>;
}
```

---

## 📊 Tables with RLS Enabled

### Core Ecommerce Tables
- ✅ `products`
- ✅ `orders`
- ✅ `order_products`
- ✅ `customers`
- ✅ `categories`
- ✅ `product_categories`

### Content Management
- ✅ `pages`
- ✅ `blogs`
- ✅ `blog_categories`

### Product Management
- ✅ `product_variants`
- ✅ `product_reviews`
- ✅ `product_wishlists`
- ✅ `attributes`
- ✅ `attribute_values`
- ✅ `brands`

### Shopping
- ✅ `cart_items`
- ✅ `coupons`

### Customer Management
- ✅ `user_delivery_addresses`
- ✅ `wallets`

### Support
- ✅ `support_tickets`
- ✅ `support_ticket_messages`

### Media & Configuration
- ✅ `media_uploads`
- ✅ `static_options`

### Payments
- ✅ `payment_logs`

### Location (Optional tenant_id)
- ✅ `cities` (allows NULL tenant_id)
- ✅ `countries` (allows NULL tenant_id)
- ✅ `states` (allows NULL tenant_id)

---

## 🔐 Security Best Practices

### 1. Always Set Tenant Context

**❌ Wrong:**
```typescript
// Don't query without setting tenant context
const products = await prisma.products.findMany();
// RLS might block or return wrong data
```

**✅ Correct:**
```typescript
// Always set tenant context first
await setTenantContext(tenant.id);
const products = await prisma.products.findMany();
// RLS filters automatically
```

### 2. Use Tenant-Aware Clients

**❌ Wrong:**
```typescript
// Don't use regular client for tenant-scoped queries
const supabase = createClient();
const { data } = await supabase.from('products').select('*');
```

**✅ Correct:**
```typescript
// Use tenant-aware client
const supabase = await createTenantServerClient(tenant.id);
const { data } = await supabase.from('products').select('*');
```

### 3. Explicit tenant_id in Prisma Queries

Even with RLS, always include `tenant_id` in Prisma WHERE clauses:

**✅ Correct:**
```typescript
const products = await prisma.products.findMany({
  where: {
    tenant_id: tenant.id, // Explicit tenant_id
    status: 'active'
  }
});
```

**Why?**
- Uses indexes for better performance
- Makes intent clear
- Provides extra security layer

### 4. Never Trust Client-Side tenant_id

**❌ Wrong:**
```typescript
// Don't accept tenant_id from client
const { tenant_id } = await request.json();
const products = await prisma.products.findMany({
  where: { tenant_id } // UNSAFE!
});
```

**✅ Correct:**
```typescript
// Always resolve tenant from hostname
const hostname = request.headers.get('host') || '';
const tenant = await getTenantFromRequest(hostname);
const products = await prisma.products.findMany({
  where: { tenant_id: tenant.id } // SAFE!
});
```

---

## 🧪 Testing RLS Policies

### Manual Testing

```typescript
import { setRLSTenantContext, testRLSPolicy } from '@/lib/rls-helpers';

// Test RLS is working
const isWorking = await testRLSPolicy(
  'products',
  'tenant-1-uuid',
  'tenant-2-uuid'
);

console.log('RLS is working:', isWorking);
```

### Automated Testing

```typescript
describe('RLS Policies', () => {
  it('should filter products by tenant', async () => {
    // Set tenant 1 context
    await setRLSTenantContext('tenant-1-uuid');
    
    // Query products
    const products = await prisma.products.findMany();
    
    // All products should belong to tenant 1
    expect(products.every(p => p.tenant_id === 'tenant-1-uuid')).toBe(true);
  });

  it('should not access other tenant data', async () => {
    // Set tenant 1 context
    await setRLSTenantContext('tenant-1-uuid');
    
    // Try to query tenant 2's products
    const products = await prisma.products.findMany({
      where: { tenant_id: 'tenant-2-uuid' }
    });
    
    // Should return empty (RLS blocks it)
    expect(products).toHaveLength(0);
  });
});
```

---

## 🚨 Common Issues & Solutions

### Issue 1: RLS Policy Not Working

**Symptoms:**
- Queries return empty results
- Getting "permission denied" errors

**Solutions:**
1. Check RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'products';`
2. Verify policy exists: `SELECT * FROM pg_policies WHERE tablename = 'products';`
3. Ensure tenant context is set: `SELECT current_setting('app.current_tenant_id', true);`

### Issue 2: Can't Insert Records

**Symptoms:**
- INSERT queries fail
- "new row violates row-level security policy"

**Solutions:**
1. Ensure policy uses `FOR ALL` (not just `FOR SELECT`)
2. Check `tenant_id` is included in INSERT data
3. Verify tenant context is set before INSERT

### Issue 3: Prisma Queries Not Filtered

**Symptoms:**
- Prisma returns all tenants' data
- RLS doesn't seem to apply

**Solutions:**
1. Prisma uses connection pooling - RLS context might not persist
2. Always include explicit `tenant_id` in WHERE clauses
3. Use Supabase client for automatic RLS filtering

---

## 📚 Migration Files

RLS setup is in: `supabase/migrations/002_setup_rls_policies.sql`

To apply:
```bash
# Using Supabase CLI
npx supabase migration up

# Or manually in Supabase Dashboard
# SQL Editor → Paste migration SQL → Run
```

---

## 🔍 Verifying RLS Setup

### Check RLS is Enabled

```sql
-- List all tables with RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;
```

### Check Policies Exist

```sql
-- List all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Test Tenant Context

```sql
-- Set tenant context
SELECT set_tenant_context('your-tenant-uuid'::UUID);

-- Check current context
SELECT current_setting('app.current_tenant_id', true);

-- Query products (should only return current tenant's)
SELECT * FROM products;
```

---

## 🎯 Summary

**RLS provides:**
- ✅ Automatic tenant data isolation
- ✅ Database-level security (cannot be bypassed)
- ✅ No need to manually filter every query
- ✅ Protection against application bugs

**Key Points:**
1. Always set tenant context before queries
2. Use tenant-aware Supabase clients
3. Include explicit `tenant_id` in Prisma WHERE clauses
4. Never trust client-provided tenant_id
5. Test RLS policies regularly

---

## 📖 References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Prisma with RLS](https://www.prisma.io/docs/guides/database/supabase)

---

**Last Updated:** 2024  
**Version:** 1.0

