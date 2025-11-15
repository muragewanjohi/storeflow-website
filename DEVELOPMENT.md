# StoreFlow Development Guide

**Complete setup and development instructions for StoreFlow**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Development Workflow](#development-workflow)
4. [Database Management](#database-management)
5. [API Development](#api-development)
6. [Component Development](#component-development)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **npm** or **pnpm** package manager
- **Git** installed
- **Supabase account** ([Sign up](https://supabase.com))
- **Vercel account** (for deployment) ([Sign up](https://vercel.com))
- **VS Code** (recommended) with extensions:
  - Prisma
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense

---

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd storeflow
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables Setup

```bash
# Copy environment template
Copy-Item env.template .env.local

# Edit .env.local with your credentials
# See ENV_SETUP_GUIDE.md for detailed instructions
```

**Required Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only!)
- `DATABASE_URL` - PostgreSQL connection string

### 4. Database Setup

#### Option A: Using Supabase Cloud (Recommended for Development)

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your connection string from: **Settings → Database → Connection string**
3. Add to `.env.local`:
   ```env
   DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   ```

#### Option B: Using Supabase Local (Advanced)

```bash
# Start Supabase locally
npm run supabase:start

# This will output local connection details
# Update DATABASE_URL in .env.local
```

### 5. Generate Prisma Client

```bash
npm run db:generate
```

### 6. Run Database Migrations

```bash
# Using Prisma migrations
npm run db:migrate

# Or using Supabase migrations
npm run supabase:migration:up
```

### 7. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Development Workflow

### Daily Development

```bash
# 1. Start development server
npm run dev

# 2. In another terminal, open Prisma Studio (optional)
npm run db:studio
# Opens at http://localhost:5555

# 3. Make your changes
# - Edit files in src/
# - Create new API routes in src/app/api/
# - Add components in src/components/

# 4. Type checking (optional)
npm run type-check

# 5. Linting
npm run lint
```

### Code Structure

```
storeflow/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes
│   │   ├── (admin)/      # Admin dashboard routes
│   │   └── (storefront)/ # Tenant storefront routes
│   ├── components/       # React components
│   │   ├── ui/          # Base UI components
│   │   └── shared/      # Shared components
│   ├── lib/             # Utilities
│   │   ├── supabase/    # Supabase clients
│   │   ├── prisma/      # Prisma client
│   │   ├── tenant-context/ # Tenant resolution
│   │   └── utils/       # Helper functions
│   └── types/           # TypeScript types
├── prisma/              # Prisma schema & migrations
├── supabase/           # Supabase migrations
└── scripts/            # Utility scripts
```

---

## Database Management

### Prisma Studio (Visual Database Browser)

```bash
npm run db:studio
```

Opens a visual database browser at `http://localhost:5555`

### Create Migration

```bash
# Make changes to prisma/schema.prisma
# Then create migration:
npm run db:migrate

# Or with custom name:
npx prisma migrate dev --name add_new_table
```

### Apply Migrations (Production)

```bash
npm run db:migrate:deploy
```

### Reset Database (Development Only!)

```bash
# ⚠️ WARNING: This deletes all data!
npm run supabase:reset
```

### Seed Database

```bash
# Create seed script in scripts/seed-[name].ts
# Then run:
npx tsx scripts/seed-[name].ts
```

### Using Migration Templates

```bash
# Copy template
Copy-Item scripts/migrate-template.ts scripts/migrate-my-feature.ts

# Edit and implement your migration
# Run:
npx tsx scripts/migrate-my-feature.ts
```

---

## API Development

### Creating API Routes

1. **Use the template:**
   ```bash
   # Copy template
   Copy-Item src/app/api/_template/route.ts src/app/api/products/route.ts
   ```

2. **Implement handlers:**
   - `GET` - List/fetch resources
   - `POST` - Create resources
   - `PUT` - Update resources
   - `DELETE` - Delete resources

3. **Tenant Context:**
   - Tenant is automatically resolved from hostname
   - Use `getTenantFromRequest()` to get tenant info
   - RLS policies automatically filter by `tenant_id`

### Example API Route

```typescript
// src/app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/tenant-context';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const tenant = await getTenantFromRequest(hostname);

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const products = await prisma.products.findMany({
    where: { tenant_id: tenant.id },
  });

  return NextResponse.json({ products });
}
```

### Testing API Routes

```bash
# Using curl
curl http://localhost:3000/api/products

# Using PowerShell
Invoke-WebRequest -Uri http://localhost:3000/api/products
```

---

## Component Development

### Creating Components

#### Shared Components (Tenant-Agnostic)

```bash
# Copy template
Copy-Item src/components/shared/_template.tsx src/components/shared/ProductCard.tsx
```

**Guidelines:**
- Components should be tenant-agnostic
- Tenant context handled by parent components
- Use TypeScript with proper typing
- Follow React best practices

#### UI Components (Base Primitives)

```bash
# Copy template
Copy-Item src/components/ui/_template.tsx src/components/ui/Button.tsx
```

**Guidelines:**
- Keep components simple and focused
- Use Radix UI primitives when possible
- Follow shadcn/ui patterns
- Make components accessible
- Support dark mode

### Component Example

```typescript
// src/components/shared/ProductCard.tsx
import { cn } from '@/lib/utils/cn';

interface ProductCardProps {
  name: string;
  price: number;
  image?: string;
  className?: string;
}

export function ProductCard({ name, price, image, className }: Readonly<ProductCardProps>) {
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      {image && <img src={image} alt={name} />}
      <h3>{name}</h3>
      <p>${price}</p>
    </div>
  );
}
```

---

## Testing

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Manual Testing Checklist

- [ ] Test API routes with different tenants
- [ ] Verify RLS policies work correctly
- [ ] Test tenant resolution (subdomain + custom domain)
- [ ] Verify authentication flows
- [ ] Test responsive design
- [ ] Check accessibility (keyboard navigation, screen readers)

---

## Troubleshooting

### Database Connection Issues

**Problem:** Cannot connect to database

**Solutions:**
1. Check `DATABASE_URL` in `.env.local`
2. Verify Supabase project is active
3. Check firewall/network settings
4. Try regenerating Prisma client: `npm run db:generate`

### Prisma Client Out of Sync

**Problem:** Type errors or missing models

**Solution:**
```bash
npm run db:generate
```

### Migration Errors

**Problem:** Migration fails

**Solutions:**
1. Check migration SQL syntax
2. Verify database connection
3. Check for conflicting migrations
4. Reset database (dev only): `npm run supabase:reset`

### Tenant Not Found

**Problem:** API returns "Tenant not found"

**Solutions:**
1. Check hostname resolution
2. Verify tenant exists in database
3. Check tenant status (should be 'active')
4. Verify subdomain/custom domain matches

### Environment Variables Not Loading

**Problem:** `process.env` is undefined

**Solutions:**
1. Ensure `.env.local` exists
2. Restart development server
3. Check variable names (must start with `NEXT_PUBLIC_` for client-side)
4. Verify no typos in variable names

---

## Useful Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint

# Database
npm run db:studio       # Open Prisma Studio
npm run db:generate     # Generate Prisma Client
npm run db:migrate      # Create/apply migrations
npm run db:push         # Push schema changes (dev only)

# Supabase
npm run supabase:start  # Start local Supabase
npm run supabase:stop   # Stop local Supabase
npm run supabase:reset  # Reset local database

# Utilities
npm run type-check      # TypeScript type checking
```

---

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Check [Migration Roadmap](../docs/NODEJS_MIGRATION_UPDATED.md) for feature roadmap
- Review [API Templates](./src/app/api/_template/route.ts) for API patterns
- See [Component Templates](./src/components/shared/_template.tsx) for component patterns

---

**Happy Coding! 🚀**

