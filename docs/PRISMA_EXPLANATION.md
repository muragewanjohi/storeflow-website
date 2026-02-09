# Prisma Explained: Integration with Supabase PostgreSQL

**Complete guide to understanding Prisma and how it works with our Supabase database**

---

## 🎯 What is Prisma?

**Prisma** is a modern **Object-Relational Mapping (ORM)** tool that provides a type-safe database client for TypeScript and Node.js applications.

### Key Concepts

**Traditional Database Access:**
```typescript
// Raw SQL queries - error-prone, no type safety
const result = await db.query('SELECT * FROM products WHERE tenant_id = $1', [tenantId]);
```

**With Prisma:**
```typescript
// Type-safe, autocompleted queries
const products = await prisma.products.findMany({
  where: { tenant_id: tenantId }
});
// TypeScript knows the exact shape of 'products'
```

---

## 🏗️ How Prisma Works

### 1. **Prisma Schema** (`schema.prisma`)

The schema file defines your database structure in a declarative way:

```prisma
// dukanest/prisma/schema.prisma

model Product {
  id          String   @id @default(uuid())
  tenant_id   String   @db.Uuid
  name        String   @db.VarChar(255)
  price       Decimal  @db.Decimal(10, 2)
  status      String   @default("active")
  created_at  DateTime @default(now())
  
  tenant      Tenant   @relation(fields: [tenant_id], references: [id])
  
  @@index([tenant_id])
  @@map("products")
}
```

**What this does:**
- Defines the `Product` model
- Maps to the `products` table in PostgreSQL
- Specifies field types, defaults, and constraints
- Defines relationships (relation to `Tenant`)
- Creates indexes for performance

### 2. **Prisma Client** (Generated Code)

When you run `npm run db:generate`, Prisma:
1. Reads your `schema.prisma` file
2. Connects to your database to introspect the schema
3. Generates a **type-safe TypeScript client** in `node_modules/@prisma/client`

**Generated Client Features:**
- ✅ Full TypeScript types for all models
- ✅ Autocomplete in your IDE
- ✅ Compile-time type checking
- ✅ Runtime query validation

---

## 🔌 Integration with Supabase PostgreSQL

### Architecture Overview

```
┌─────────────────────────────────────────┐
│         Your Next.js Application         │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │     Prisma Client (Generated)     │  │
│  │  - Type-safe database queries     │  │
│  │  - TypeScript types               │  │
│  │  - Query builder                  │  │
│  └──────────────┬───────────────────┘  │
└─────────────────┼──────────────────────┘
                  │
                  │ SQL Queries
                  │
┌─────────────────▼──────────────────────┐
│      Supabase PostgreSQL Database       │
│  - PostgreSQL database                 │
│  - Row-Level Security (RLS)            │
│  - Connection pooling                  │
└────────────────────────────────────────┘
```

### Connection Setup

**1. Database Connection String**

In `.env.local`:
```env
DATABASE_URL=postgresql://postgres:[password]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

**2. Prisma Configuration**

In `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  // PostgreSQL provider
  url      = env("DATABASE_URL")  // Connection string from .env
}
```

**3. Prisma Client Initialization**

In `src/lib/prisma/client.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

// Singleton pattern - one instance for the app
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

---

## 💡 How We Use Prisma in DukaNest

### Example 1: Querying Products

**Without Prisma (Raw SQL):**
```typescript
// Error-prone, no type safety
const result = await db.query(
  'SELECT * FROM products WHERE tenant_id = $1 AND status = $2',
  [tenantId, 'active']
);
// What's the shape of result? Unknown!
```

**With Prisma:**
```typescript
// Type-safe, autocompleted
const products = await prisma.products.findMany({
  where: {
    tenant_id: tenantId,
    status: 'active'
  },
  include: {
    tenant: true  // Automatically joins Tenant table
  }
});

// TypeScript knows: products is Product[]
// IDE autocompletes: products[0].name, products[0].price, etc.
```

### Example 2: Creating a Product

**With Prisma:**
```typescript
const product = await prisma.products.create({
  data: {
    tenant_id: tenantId,
    name: 'New Product',
    price: 29.99,
    status: 'active',
    sku: 'PROD-001'
  }
});

// TypeScript ensures:
// - All required fields are provided
// - Field types are correct
// - Foreign keys are valid UUIDs
```

### Example 3: Complex Queries

**With Prisma:**
```typescript
// Get products with categories, filtered by tenant
const products = await prisma.products.findMany({
  where: {
    tenant_id: tenantId,
    status: 'active',
    price: {
      gte: 10,  // Greater than or equal
      lte: 100  // Less than or equal
    }
  },
  include: {
    productCategories: {
      include: {
        category: true
      }
    }
  },
  orderBy: {
    created_at: 'desc'
  },
  take: 10,  // Limit to 10 results
  skip: 0    // Pagination offset
});

// Fully type-safe, even with nested relations!
```

---

## 🔄 Prisma Workflow in Our Project

### Development Workflow

```bash
# 1. Edit schema.prisma
# Add new model, field, or relation

# 2. Generate Prisma Client (updates types)
npm run db:generate

# 3. Sync schema to database (development)
npm run db:push

# OR create migration (production)
npm run db:migrate

# 4. Use Prisma Client in your code
import { prisma } from '@/lib/prisma/client';
```

### Schema Changes Example

**Before:**
```prisma
model Product {
  id        String  @id
  name      String
  price     Decimal
}
```

**After (adding a field):**
```prisma
model Product {
  id          String  @id
  name        String
  price       Decimal
  description String?  // NEW FIELD
}
```

**Then:**
```bash
npm run db:generate  # Updates TypeScript types
npm run db:push      # Adds column to database
```

**Now TypeScript knows about `description`:**
```typescript
const product = await prisma.products.create({
  data: {
    name: 'Product',
    price: 29.99,
    description: 'This is a new product'  // ✅ TypeScript knows this field exists
  }
});
```

---

## 🎨 Prisma Features We Use

### 1. **Type Safety**

```typescript
// Prisma generates types automatically
import { Product, Tenant } from '@prisma/client';

// TypeScript knows the exact shape
const product: Product = {
  id: 'uuid',
  tenant_id: 'uuid',
  name: 'Product',
  price: 29.99,
  // ... all fields are typed
};

// Compile-time errors if you use wrong types
product.price = 'invalid';  // ❌ TypeScript error!
```

### 2. **Relations**

```prisma
model Product {
  tenant_id  String  @db.Uuid
  tenant      Tenant  @relation(fields: [tenant_id], references: [id])
}

model Tenant {
  products    Product[]
}
```

**Usage:**
```typescript
// Include related data
const tenant = await prisma.tenants.findUnique({
  where: { id: tenantId },
  include: {
    products: true  // Automatically fetches all products
  }
});

// tenant.products is Product[]
```

### 3. **Query Builder**

```typescript
// Filtering
await prisma.products.findMany({
  where: {
    tenant_id: tenantId,
    status: 'active',
    price: { gte: 10, lte: 100 }
  }
});

// Sorting
await prisma.products.findMany({
  orderBy: [
    { price: 'asc' },
    { created_at: 'desc' }
  ]
});

// Pagination
await prisma.products.findMany({
  skip: 0,
  take: 10
});
```

### 4. **Transactions**

```typescript
// Multiple operations in one transaction
await prisma.$transaction([
  prisma.products.create({ data: productData }),
  prisma.orders.create({ data: orderData }),
  prisma.customers.update({ 
    where: { id: customerId },
    data: { email: 'new@email.com' }
  })
]);
```

---

## 🔒 Prisma + Supabase Row-Level Security (RLS)

### How They Work Together

**Supabase RLS** enforces security at the database level:
```sql
-- RLS Policy in Supabase
CREATE POLICY "products_tenant_isolation"
  ON products FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

**Prisma** queries respect RLS automatically:
```typescript
// Prisma query
const products = await prisma.products.findMany({
  where: { tenant_id: tenantId }
});

// Prisma generates SQL:
// SELECT * FROM products WHERE tenant_id = 'uuid'
// 
// RLS policy automatically filters results
// Even if query doesn't specify tenant_id, RLS enforces it
```

**Important:** Prisma queries still need `tenant_id` in WHERE clauses for:
1. **Performance** - Uses indexes
2. **Clarity** - Explicit tenant filtering
3. **RLS Backup** - Extra security layer

---

## 📊 Prisma vs Raw SQL

### Comparison

| Feature | Raw SQL | Prisma |
|---------|---------|--------|
| **Type Safety** | ❌ None | ✅ Full TypeScript types |
| **Autocomplete** | ❌ None | ✅ Full IDE support |
| **SQL Injection** | ⚠️ Risk if not careful | ✅ Protected |
| **Relations** | ❌ Manual JOINs | ✅ Automatic |
| **Migrations** | ❌ Manual SQL files | ✅ Declarative schema |
| **Learning Curve** | ⚠️ SQL knowledge needed | ✅ Simple API |

### Example Comparison

**Raw SQL:**
```typescript
const result = await db.query(`
  SELECT p.*, t.name as tenant_name
  FROM products p
  JOIN tenants t ON p.tenant_id = t.id
  WHERE p.tenant_id = $1 AND p.status = $2
  ORDER BY p.created_at DESC
  LIMIT $3 OFFSET $4
`, [tenantId, 'active', 10, 0]);

// No type safety, manual JOIN, SQL injection risk
```

**Prisma:**
```typescript
const products = await prisma.products.findMany({
  where: {
    tenant_id: tenantId,
    status: 'active'
  },
  include: {
    tenant: true
  },
  orderBy: {
    created_at: 'desc'
  },
  take: 10,
  skip: 0
});

// Type-safe, automatic JOIN, protected from SQL injection
```

---

## 🛠️ Prisma Commands We Use

### Development Commands

```bash
# Generate Prisma Client (after schema changes)
npm run db:generate

# Sync schema to database (development)
npm run db:push

# Create migration (production)
npm run db:migrate

# Open Prisma Studio (visual database browser)
npm run db:studio

# View migrations
npx prisma migrate status
```

### What Each Command Does

**`db:generate`**
- Reads `schema.prisma`
- Generates TypeScript types
- Creates Prisma Client in `node_modules/@prisma/client`
- **Run this after any schema changes**

**`db:push`**
- Pushes schema changes directly to database
- Good for development
- **Doesn't create migration files**
- **Use for rapid prototyping**

**`db:migrate`**
- Creates migration files in `prisma/migrations/`
- Tracks schema history
- **Use for production**
- **Allows rollback**

**`db:studio`**
- Opens visual database browser at `http://localhost:5555`
- View/edit data through UI
- **Great for debugging**

---

## 📁 Our Prisma Setup

### File Structure

```
dukanest/
├── prisma/
│   ├── schema.prisma          # Database schema definition
│   └── migrations/            # Migration history (if using migrations)
├── src/
│   └── lib/
│       └── prisma/
│           └── client.ts      # Prisma Client singleton
└── node_modules/
    └── @prisma/
        └── client/            # Generated Prisma Client
```

### Schema Organization

```prisma
// Central tables (no tenant_id)
model Tenant { ... }
model PricePlan { ... }
model Admin { ... }
model Theme { ... }
model Plugin { ... }

// Tenant-scoped tables (with tenant_id)
model Product { ... }
model Order { ... }
model Customer { ... }
```

---

## 🎯 Benefits for DukaNest

### 1. **Type Safety**
- Catch errors at compile-time, not runtime
- IDE autocomplete for all database fields
- Refactoring is safe (TypeScript will catch breaking changes)

### 2. **Developer Experience**
- No need to write raw SQL
- Intuitive query API
- Automatic relation handling

### 3. **Maintainability**
- Schema is the single source of truth
- Changes are tracked in migrations
- Easy to understand database structure

### 4. **Performance**
- Prisma optimizes queries
- Uses database indexes efficiently
- Connection pooling handled automatically

### 5. **Security**
- Protection from SQL injection
- Type validation
- Works seamlessly with Supabase RLS

---

## 🔍 Real Examples from Our Codebase

### Example: API Route Using Prisma

```typescript
// src/app/api/products/route.ts
import { prisma } from '@/lib/prisma/client';
import { getTenantFromRequest } from '@/lib/tenant-context';

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const tenant = await getTenantFromRequest(hostname);

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // Prisma query - type-safe, autocompleted
  const products = await prisma.products.findMany({
    where: {
      tenant_id: tenant.id,  // TypeScript knows tenant.id is string
      status: 'active'
    },
    include: {
      productCategories: {
        include: {
          category: true
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // products is fully typed - TypeScript knows the structure
  return NextResponse.json({ products });
}
```

### Example: Creating Related Records

```typescript
// Create order with order products
const order = await prisma.orders.create({
  data: {
    tenant_id: tenantId,
    order_number: 'ORD-001',
    total_amount: 99.99,
    status: 'pending',
    orderProducts: {  // Nested create
      create: [
        {
          tenant_id: tenantId,
          product_id: productId,
          quantity: 2,
          price: 29.99,
          total: 59.98
        }
      ]
    }
  },
  include: {
    orderProducts: {
      include: {
        product: true
      }
    }
  }
});

// order.orderProducts[0].product is fully typed!
```

---

## 🚨 Common Gotchas

### 1. **Always Generate After Schema Changes**

```bash
# ❌ Wrong: Using Prisma Client without regenerating
# Edit schema.prisma → Use prisma client → Types are outdated!

# ✅ Correct: Always generate after changes
# Edit schema.prisma → npm run db:generate → Use prisma client
```

### 2. **Use Prisma Client Singleton**

```typescript
// ❌ Wrong: Creating multiple instances
const prisma1 = new PrismaClient();
const prisma2 = new PrismaClient();  // Connection pool issues!

// ✅ Correct: Use singleton
import { prisma } from '@/lib/prisma/client';
```

### 3. **Handle Relations Correctly**

```typescript
// ❌ Wrong: Trying to set relation directly
await prisma.products.create({
  data: {
    tenant: { ... }  // Can't create tenant here
  }
});

// ✅ Correct: Use foreign key
await prisma.products.create({
  data: {
    tenant_id: tenantId  // Use the ID
  }
});
```

---

## 📚 Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma with PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Prisma with Supabase](https://www.prisma.io/docs/guides/database/supabase)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

---

## 🎓 Summary

**Prisma is:**
- ✅ A type-safe ORM for TypeScript/Node.js
- ✅ Generates TypeScript types from your database schema
- ✅ Provides an intuitive query API
- ✅ Works seamlessly with Supabase PostgreSQL
- ✅ Handles relations, transactions, and migrations

**In DukaNest:**
- ✅ We define our database structure in `schema.prisma`
- ✅ Prisma generates type-safe client code
- ✅ We use Prisma Client to query Supabase PostgreSQL
- ✅ RLS policies work automatically with Prisma queries
- ✅ Type safety catches errors before runtime

**Key Takeaway:** Prisma bridges the gap between your TypeScript code and PostgreSQL database, providing type safety, autocomplete, and a modern developer experience while working seamlessly with Supabase's features like RLS.

---

**Last Updated:** 2024  
**Version:** 1.0

