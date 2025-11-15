# StoreFlow Architecture Documentation

**Complete system architecture and design patterns**

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Multi-Tenancy Strategy](#multi-tenancy-strategy)
4. [Database Architecture](#database-architecture)
5. [API Architecture](#api-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [Security Architecture](#security-architecture)
8. [Deployment Architecture](#deployment-architecture)

---

## System Overview

StoreFlow is a **multi-tenant ecommerce platform** built with:

- **Next.js 15** - React framework with App Router
- **Supabase** - PostgreSQL database + Authentication + Storage
- **Vercel** - Multi-tenant hosting platform
- **Prisma** - Type-safe database ORM
- **Row-Level Security (RLS)** - Automatic tenant data isolation

### Key Features

✅ **Single Shared Database** - All tenants in one database  
✅ **Automatic Tenant Isolation** - RLS policies enforce data separation  
✅ **Subdomain & Custom Domains** - Flexible domain management  
✅ **Scalable Architecture** - Built for growth  
✅ **Type-Safe** - Full TypeScript support  

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Multi-Tenant Platform              │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ tenant1.com  │  │ tenant2.com  │  │ *.dukanest   │       │
│  │              │  │              │  │ .com         │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                  │                  │                │
│         └──────────────────┼──────────────────┘              │
│                            │                                  │
│                    ┌───────▼────────┐                        │
│                    │   Next.js App   │                        │
│                    │  (App Router)   │                        │
│                    │                 │                        │
│                    │  ┌───────────┐ │                        │
│                    │  │Middleware │ │  Tenant Resolution      │
│                    │  └─────┬─────┘ │                        │
│                    │        │       │                        │
│                    │  ┌─────▼─────┐ │                        │
│                    │  │ API Routes │ │  /api/products        │
│                    │  │            │ │  /api/orders           │
│                    │  │            │ │  /api/admin/tenants   │
│                    │  └─────┬─────┘ │                        │
│                    └────────┼───────┘                        │
└────────────────────────────┼────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │    Supabase     │
                    │                 │
                    │  ┌───────────┐  │
                    │  │PostgreSQL │  │  Shared Database      │
                    │  │  (RLS)    │  │  tenant_id isolation  │
                    │  └───────────┘  │                        │
                    │                 │                        │
                    │  ┌───────────┐  │                        │
                    │  │   Auth    │  │  Supabase Auth         │
                    │  └───────────┘  │                        │
                    │                 │                        │
                    │  ┌───────────┐  │                        │
                    │  │  Storage  │  │  File Storage          │
                    │  └───────────┘  │                        │
                    └─────────────────┘
```

---

## Multi-Tenancy Strategy

### Single Database with Row-Level Security

**Approach:** One PostgreSQL database shared by all tenants, with `tenant_id` column in every tenant-scoped table.

**Benefits:**
- ✅ Easier to manage and scale
- ✅ Lower operational overhead
- ✅ Better for cross-tenant analytics
- ✅ Simpler migrations

**Tenant Isolation:**
- **Row-Level Security (RLS)** policies automatically filter data by `tenant_id`
- Policies enforced at database level (cannot be bypassed)
- Each tenant can only access their own data

### Tenant Resolution Flow

```
1. Request arrives → tenant1.dukanest.com
2. Middleware extracts subdomain → "tenant1"
3. Query tenants table → Find tenant by subdomain
4. Set tenant context → Store tenant_id in headers
5. API routes use tenant_id → RLS filters automatically
6. Response returned → Tenant-specific data only
```

### Domain Management

**Subdomains:**
- Format: `{subdomain}.dukanest.com`
- Example: `tenant1.dukanest.com`
- Automatically managed by Vercel

**Custom Domains:**
- Format: `{custom-domain}.com`
- Example: `mystore.com`
- Added via Vercel Domain API
- SSL certificates issued automatically

---

## Database Architecture

### Schema Design

**Central Tables (No tenant_id):**
- `tenants` - Tenant registry
- `price_plans` - Subscription plans
- `admins` - Landlord admin users
- `themes` - Available themes
- `plugins` - Available plugins

**Tenant-Scoped Tables (With tenant_id):**
- `products` - Tenant products
- `orders` - Tenant orders
- `customers` - Tenant customers
- `categories` - Product categories
- `pages` - Custom pages
- `blogs` - Blog posts
- ... (50+ more tables)

### Row-Level Security (RLS)

**Policy Example:**
```sql
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Tenant isolation for products"
  ON products
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

**How It Works:**
1. Middleware sets tenant context: `set_config('app.current_tenant_id', tenant_id)`
2. RLS policies automatically filter queries
3. Users can only see/update their tenant's data
4. Cannot be bypassed (enforced at database level)

### Indexes

**Critical Indexes:**
```sql
-- Tenant queries (most common)
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_products_tenant_status ON products(tenant_id, status);

-- Composite indexes for common queries
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX idx_customers_tenant_email ON customers(tenant_id, email);
```

---

## API Architecture

### Route Structure

```
/api/
├── products/          # Product CRUD
├── orders/            # Order management
├── customers/         # Customer management
├── admin/
│   ├── tenants/      # Tenant management (landlord)
│   └── plans/         # Plan management
└── _template/         # API route template
```

### Request Flow

```
1. Request → middleware.ts
2. Extract hostname → getTenantFromRequest()
3. Query tenants table → Find tenant
4. Set tenant context → x-tenant-id header
5. Route handler → Process request
6. Database query → RLS filters automatically
7. Response → Return tenant-specific data
```

### API Route Pattern

```typescript
// Standard pattern for all API routes
export async function GET(request: NextRequest) {
  // 1. Resolve tenant
  const tenant = await getTenantFromRequest(hostname);
  
  // 2. Query with tenant_id (RLS auto-filters)
  const data = await prisma.products.findMany({
    where: { tenant_id: tenant.id },
  });
  
  // 3. Return response
  return NextResponse.json({ data });
}
```

---

## Frontend Architecture

### Component Structure

```
src/components/
├── ui/              # Base UI components (shadcn/ui style)
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Card.tsx
├── shared/          # Shared business components
│   ├── ProductCard.tsx
│   ├── OrderList.tsx
│   └── CustomerForm.tsx
└── [theme]/         # Theme-specific components
    ├── hexfashion/
    └── aromatic/
```

### Page Structure

```
src/app/
├── (storefront)/    # Tenant storefront routes
│   ├── products/
│   ├── cart/
│   └── checkout/
├── (admin)/         # Admin dashboard routes
│   ├── products/
│   ├── orders/
│   └── settings/
└── api/             # API routes
```

### State Management

- **Server State:** TanStack Query (React Query)
- **Form State:** React Hook Form
- **UI State:** React useState/useReducer
- **Global State:** React Context (minimal)

---

## Security Architecture

### Authentication

**Supabase Auth:**
- Email/password authentication
- OAuth providers (Google, GitHub, etc.)
- Magic links
- JWT tokens

**Role-Based Access Control:**
- **Landlord Admin** - Full platform access
- **Tenant Admin** - Tenant-specific access
- **Tenant Staff** - Limited tenant access
- **Customer** - Public storefront access

### Data Isolation

**Row-Level Security (RLS):**
- Enforced at database level
- Cannot be bypassed
- Automatic tenant filtering
- Policies tested and verified

**API Security:**
- Tenant validation on every request
- Input validation with Zod
- Rate limiting (Vercel)
- CORS protection

---

## Deployment Architecture

### Vercel Multi-Tenant Platform

**Features:**
- Automatic SSL certificates
- Global CDN
- Edge functions
- Preview deployments
- Domain management API

**Deployment Flow:**
```
1. Push to GitHub → Triggers Vercel build
2. Build Next.js app → Creates production bundle
3. Deploy to Vercel → Global CDN distribution
4. Domain routing → Automatic SSL setup
5. Live → Available worldwide
```

### Environment Management

**Development:**
- `.env.local` - Local environment variables
- Supabase local (optional) or cloud

**Production:**
- Vercel Environment Variables
- Supabase production project
- Separate database (backed up)

---

## Performance Optimization

### Database

- **Indexes** on `tenant_id` columns
- **Connection pooling** (Supabase handles automatically)
- **Query optimization** (Prisma query analysis)

### Caching

- **Vercel KV** (Redis) for tenant resolution caching
- **Next.js caching** for static pages
- **CDN caching** for static assets

### Code Splitting

- **Route-based splitting** (Next.js automatic)
- **Component lazy loading** (React.lazy)
- **Dynamic imports** for heavy libraries

---

## Monitoring & Observability

### Logging

- **Vercel Logs** - Request/response logs
- **Supabase Logs** - Database query logs
- **Application Logs** - Custom logging

### Error Tracking

- **Vercel Error Tracking** - Built-in error monitoring
- **Sentry** (optional) - Advanced error tracking

### Analytics

- **Vercel Analytics** - Web vitals
- **Custom Analytics** - Tenant-specific metrics

---

## Scalability Considerations

### Horizontal Scaling

- **Vercel** - Automatically scales
- **Supabase** - Handles connection pooling
- **Database** - Can scale read replicas

### Vertical Scaling

- **Database** - Upgrade Supabase plan
- **Compute** - Vercel Pro plan

### Future Optimizations

- **Read Replicas** - For heavy read workloads
- **Caching Layer** - Redis for frequently accessed data
- **CDN** - Already handled by Vercel

---

## References

- [Migration Roadmap](../docs/NODEJS_MIGRATION_UPDATED.md) - Complete roadmap
- [Development Guide](./DEVELOPMENT.md) - Setup instructions
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [Vercel Multi-Tenant Docs](https://vercel.com/docs/multi-tenant)

---

**Last Updated:** 2024  
**Version:** 1.0

