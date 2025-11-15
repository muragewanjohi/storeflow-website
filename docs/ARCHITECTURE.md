# StoreFlow Architecture Documentation
## Complete System Architecture & Design

**Version:** 1.0  
**Date:** 2024  
**Status:** ✅ Complete

---

## 🏗️ System Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Multi-Tenant Platform                  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ tenant1.com  │  │ tenant2.com  │  │ *.storeflow  │         │
│  │              │  │              │  │ .com          │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                │
│                            │                                    │
│                    ┌───────▼────────┐                          │
│                    │   Next.js App   │                          │
│                    │  (App Router)   │                          │
│                    │                 │                          │
│                    │  ┌───────────┐ │                          │
│                    │  │Middleware │ │  Tenant Resolution        │
│                    │  └─────┬─────┘ │                          │
│                    │        │       │                          │
│                    │  ┌─────▼─────┐ │                          │
│                    │  │ API Routes │ │  /api/products          │
│                    │  │            │ │  /api/orders             │
│                    │  │            │ │  /api/admin/tenants     │
│                    │  └─────┬─────┘ │                          │
│                    └────────┼───────┘                          │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │    Supabase     │
                    │                 │
                    │  ┌───────────┐  │
                    │  │PostgreSQL │  │  Shared Database        │
                    │  │  (RLS)    │  │  tenant_id isolation    │
                    │  └───────────┘  │                          │
                    │                 │                          │
                    │  ┌───────────┐  │                          │
                    │  │   Auth    │  │  Supabase Auth           │
                    │  │  (JWT)    │  │  User management         │
                    │  └───────────┘  │                          │
                    │                 │                          │
                    │  ┌───────────┐  │                          │
                    │  │  Storage  │  │  File uploads            │
                    │  │  (S3)     │  │  Product images          │
                    │  └───────────┘  │                          │
                    │                 │                          │
                    │  ┌───────────┐  │                          │
                    │  │  Realtime │  │  Live updates           │
                    │  │  (PubSub) │  │  Order status           │
                    │  └───────────┘  │                          │
                    └─────────────────┘
```

---

## 🔐 Tenant Isolation Strategy

### Row-Level Security (RLS) + Tenant ID

**Approach:** Single shared database with `tenant_id` column + RLS policies

#### How It Works:

1. **Tenant Resolution (Middleware)**
   ```typescript
   // middleware.ts
   - Extract subdomain/custom domain from request
   - Query tenants table to get tenant_id
   - Set tenant context in request headers
   ```

2. **RLS Policy Enforcement**
   ```sql
   -- All tenant-scoped tables have RLS enabled
   ALTER TABLE products ENABLE ROW LEVEL SECURITY;
   
   -- Policy automatically filters by tenant_id
   CREATE POLICY "products_tenant_isolation"
     ON products FOR ALL
     USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
   ```

3. **Application-Level Context**
   ```typescript
   // Set tenant context before queries
   await supabase.rpc('set_tenant_context', { tenant_id });
   
   // All queries automatically filtered by tenant_id
   const { data } = await supabase.from('products').select('*');
   // Only returns products for current tenant
   ```

#### Security Benefits:

✅ **Automatic Isolation:** RLS enforces tenant boundaries at database level  
✅ **No Data Leakage:** Impossible to query other tenant's data  
✅ **Performance:** Indexed `tenant_id` columns for fast queries  
✅ **Scalability:** Single database easier to scale than multiple DBs

---

## 📁 API Structure

### API Route Organization

```
src/app/api/
├── admin/                    # Landlord admin routes
│   ├── tenants/             # Tenant management
│   │   ├── route.ts         # GET /api/admin/tenants
│   │   └── [id]/            # Tenant-specific routes
│   │       ├── route.ts     # GET/PUT/DELETE /api/admin/tenants/[id]
│   │       └── domains/     # Domain management
│   ├── plans/               # Price plan management
│   │   └── route.ts         # GET/POST /api/admin/plans
│   └── analytics/           # Cross-tenant analytics
│       └── route.ts         # GET /api/admin/analytics
│
├── [tenant]/                # Tenant-scoped routes (via middleware)
│   ├── products/            # Product management
│   │   ├── route.ts         # GET/POST /api/products
│   │   └── [id]/            # Product-specific routes
│   │       └── route.ts     # GET/PUT/DELETE /api/products/[id]
│   ├── orders/              # Order management
│   │   ├── route.ts         # GET/POST /api/orders
│   │   └── [id]/            # Order-specific routes
│   │       └── route.ts     # GET/PUT /api/orders/[id]
│   ├── customers/           # Customer management
│   │   └── route.ts         # GET/POST /api/customers
│   └── settings/            # Tenant settings
│       └── route.ts         # GET/PUT /api/settings
│
└── webhooks/                # Webhook endpoints
    ├── stripe/              # Stripe webhooks
    │   └── route.ts         # POST /api/webhooks/stripe
    └── paypal/              # PayPal webhooks
        └── route.ts         # POST /api/webhooks/paypal
```

### API Route Examples

#### Tenant-Scoped Route (Products)

```typescript
// src/app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/tenant-context';
import { createTenantSupabaseClient } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const tenant = await getTenantFromRequest(hostname);

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const supabase = createTenantSupabaseClient(tenant.id);
  
  // RLS automatically filters by tenant_id
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'active');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products });
}

export async function POST(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const tenant = await getTenantFromRequest(hostname);

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const body = await request.json();
  const supabase = createTenantSupabaseClient(tenant.id);

  // Explicitly set tenant_id (RLS will verify)
  const { data: product, error } = await supabase
    .from('products')
    .insert({
      ...body,
      tenant_id: tenant.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product });
}
```

#### Admin Route (Tenant Management)

```typescript
// src/app/api/admin/tenants/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addTenantDomain } from '@/lib/vercel-domains';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin
);

export async function GET(request: NextRequest) {
  // Admin authentication check
  const user = await getAuthenticatedAdmin(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tenants });
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedAdmin(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { subdomain, name, planId } = body;

  try {
    // Create tenant in database
    const { data: tenant, error: dbError } = await supabase
      .from('tenants')
      .insert({
        subdomain,
        name,
        plan_id: planId,
        status: 'active',
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Add domain to Vercel
    const domain = `${subdomain}.storeflow.com`;
    await addTenantDomain(domain, process.env.VERCEL_PROJECT_ID!);

    // Update tenant with domain info
    await supabase
      .from('tenants')
      .update({ custom_domain: domain })
      .eq('id', tenant.id);

    return NextResponse.json({ tenant });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## 📂 Folder Structure

### Complete Next.js Project Structure

```
storeflow/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (storefront)/            # Tenant storefront routes
│   │   │   ├── layout.tsx            # Storefront layout
│   │   │   ├── page.tsx              # Home page
│   │   │   ├── products/             # Product pages
│   │   │   │   ├── page.tsx          # Product listing
│   │   │   │   └── [slug]/           # Product detail
│   │   │   │       └── page.tsx
│   │   │   ├── cart/                 # Shopping cart
│   │   │   │   └── page.tsx
│   │   │   ├── checkout/             # Checkout flow
│   │   │   │   └── page.tsx
│   │   │   └── account/              # Customer account
│   │   │       ├── orders/
│   │   │       └── profile/
│   │   │
│   │   ├── (admin)/                  # Admin dashboard routes
│   │   │   ├── layout.tsx             # Admin layout
│   │   │   ├── dashboard/            # Dashboard
│   │   │   ├── products/             # Product management
│   │   │   ├── orders/               # Order management
│   │   │   ├── customers/            # Customer management
│   │   │   ├── settings/             # Settings
│   │   │   └── tenants/             # Tenant management (landlord)
│   │   │
│   │   ├── api/                      # API routes
│   │   │   ├── admin/                 # Landlord admin API
│   │   │   │   ├── tenants/
│   │   │   │   └── plans/
│   │   │   ├── products/             # Product API
│   │   │   ├── orders/               # Order API
│   │   │   ├── customers/            # Customer API
│   │   │   └── webhooks/             # Webhook endpoints
│   │   │
│   │   ├── auth/                     # Authentication pages
│   │   │   ├── login/
│   │   │   └── register/
│   │   │
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Landing page
│   │   └── middleware.ts             # Tenant resolution middleware
│   │
│   ├── components/                   # React components
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   │
│   │   ├── shared/                   # Shared components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   └── Cart.tsx
│   │   │
│   │   └── admin/                    # Admin components
│   │       ├── DataTable.tsx
│   │       ├── ProductForm.tsx
│   │       └── OrderStatus.tsx
│   │
│   ├── lib/                          # Utilities & helpers
│   │   ├── supabase/                 # Supabase clients
│   │   │   ├── client.ts              # Client-side client
│   │   │   ├── server.ts              # Server-side client
│   │   │   └── admin.ts               # Admin client (service role)
│   │   │
│   │   ├── tenant-context/            # Tenant resolution
│   │   │   ├── getTenant.ts          # Get tenant from request
│   │   │   ├── setTenantContext.ts   # Set tenant context
│   │   │   └── TenantProvider.tsx    # React context provider
│   │   │
│   │   ├── theme-engine/             # Theme system
│   │   │   ├── ThemeProvider.tsx
│   │   │   ├── themeRegistry.ts
│   │   │   └── themeResolver.ts
│   │   │
│   │   ├── vercel-domains/           # Vercel domain management
│   │   │   └── domains.ts
│   │   │
│   │   ├── auth/                     # Authentication helpers
│   │   │   └── auth.ts
│   │   │
│   │   ├── validations/              # Zod schemas
│   │   │   ├── product.ts
│   │   │   ├── order.ts
│   │   │   └── customer.ts
│   │   │
│   │   └── utils/                     # General utilities
│   │       ├── cn.ts                 # Class name utility
│   │       ├── format.ts             # Formatting helpers
│   │       └── errors.ts             # Error handling
│   │
│   ├── themes/                       # Theme components
│   │   ├── hexfashion/               # HexFashion theme
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   └── index.ts
│   │   ├── aromatic/                 # Aromatic theme
│   │   └── bookpoint/               # BookPoint theme
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── useTenant.ts
│   │   ├── useProducts.ts
│   │   ├── useOrders.ts
│   │   └── useCart.ts
│   │
│   └── types/                        # TypeScript types
│       ├── database.ts               # Database types (Prisma)
│       ├── tenant.ts
│       ├── product.ts
│       ├── order.ts
│       └── theme.ts
│
├── supabase/                         # Supabase configuration
│   ├── migrations/                   # Database migrations
│   │   ├── 20240101000000_initial_schema.sql
│   │   └── ...
│   ├── seed.sql                      # Seed data
│   └── config.toml                   # Supabase config
│
├── prisma/                           # Prisma configuration
│   ├── schema.prisma                 # Prisma schema
│   └── migrations/                   # Prisma migrations
│
├── public/                           # Static assets
│   ├── images/
│   └── fonts/
│
├── .env.local                        # Environment variables (gitignored)
├── .env.example                      # Example env file
├── .gitignore
├── next.config.ts                    # Next.js configuration
├── tailwind.config.ts                 # Tailwind configuration
├── tsconfig.json                     # TypeScript configuration
├── package.json
└── README.md
```

---

## 🔄 Data Flow

### Tenant Request Flow

```
1. User visits tenant1.storeflow.com
   ↓
2. Next.js Middleware intercepts request
   ↓
3. Extract subdomain: "tenant1"
   ↓
4. Query Supabase: SELECT * FROM tenants WHERE subdomain = 'tenant1'
   ↓
5. Set tenant context: x-tenant-id header
   ↓
6. Route to appropriate page/API
   ↓
7. API route calls getTenantFromRequest()
   ↓
8. Create Supabase client with tenant context
   ↓
9. Set RLS context: set_tenant_context(tenant_id)
   ↓
10. Query database (RLS automatically filters)
   ↓
11. Return tenant-scoped data
```

### Order Creation Flow

```
1. Customer adds products to cart
   ↓
2. Customer proceeds to checkout
   ↓
3. POST /api/orders
   ↓
4. Middleware resolves tenant
   ↓
5. Validate cart items
   ↓
6. Calculate totals (subtotal, tax, shipping)
   ↓
7. Apply coupon (if any)
   ↓
8. Create order in database (with tenant_id)
   ↓
9. Create order_items (with tenant_id)
   ↓
10. Update inventory
   ↓
11. Route to payment gateway
   ↓
12. Payment gateway processes payment
   ↓
13. Webhook updates order status
   ↓
14. Send confirmation email
```

---

## 🔒 Security Architecture

### Multi-Layer Security

1. **Database Level (RLS)**
   - Row-Level Security policies
   - Automatic tenant isolation
   - Cannot bypass RLS

2. **Application Level**
   - Tenant resolution middleware
   - Explicit tenant_id checks
   - Authentication required

3. **API Level**
   - Rate limiting
   - Input validation (Zod)
   - CSRF protection

4. **Network Level**
   - HTTPS only (Vercel)
   - SSL certificates (automatic)
   - DDoS protection (Vercel)

---

## 📊 Performance Optimization

### Caching Strategy

1. **Vercel KV (Redis)**
   - Tenant lookup cache (1 hour TTL)
   - Product listing cache (5 minutes TTL)
   - Order status cache (1 minute TTL)

2. **Next.js Caching**
   - Static page generation (ISR)
   - API route caching
   - Image optimization

3. **Supabase Caching**
   - Connection pooling
   - Query result caching
   - Real-time subscriptions

### Database Optimization

1. **Indexes**
   - `tenant_id` indexes on all tenant tables
   - Composite indexes (`tenant_id` + status)
   - Foreign key indexes

2. **Query Optimization**
   - Use Prisma for type-safe queries
   - Batch operations
   - Pagination for large datasets

---

## 🚀 Deployment Architecture

### Vercel Multi-Tenant Setup

1. **Domain Management**
   - Wildcard DNS: `*.storeflow.com`
   - Custom domains per tenant
   - Automatic SSL certificates

2. **Environment Variables**
   - Per-environment configs
   - Secrets management
   - Feature flags

3. **Edge Functions**
   - Tenant resolution at edge
   - Caching at edge
   - Global CDN

---

## 📝 Summary

### Key Architecture Decisions:

✅ **Single Shared Database** - Easier to manage and scale  
✅ **RLS for Tenant Isolation** - Automatic security at database level  
✅ **Next.js App Router** - Modern React framework with SSR  
✅ **Supabase** - Database, Auth, Storage, Real-time  
✅ **Vercel** - Hosting, Multi-tenant, Edge functions  
✅ **Prisma** - Type-safe database client  
✅ **Component-Based Themes** - Flexible theme system

---

**Status:** ✅ Architecture Documentation Complete  
**Next:** Day 5 - Development Environment Setup

