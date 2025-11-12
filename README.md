# StoreFlow - Multi-Tenant Ecommerce Platform
## Next.js + Supabase + Vercel

**Slogan:** "Start Your Store. Grow Your Business. It's That Simple."

---

## 🚀 Project Overview

StoreFlow is a modern, multi-tenant ecommerce platform built with:
- **Next.js 14+** (App Router, Server Components, TypeScript)
- **Supabase** (PostgreSQL database, Authentication, Storage, RLS)
- **Vercel** (Hosting, Multi-Tenant Platform, Edge Functions)
- **Prisma** (Type-safe database client)

---

## 📁 Project Structure

```
storeflow/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── (storefront)/      # Tenant storefront routes
│   │   ├── (admin)/           # Admin dashboard routes
│   │   ├── api/               # API routes
│   │   └── layout.tsx          # Root layout
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui components
│   │   └── shared/            # Shared components
│   ├── lib/                   # Utilities
│   │   ├── theme-engine/      # Theme system
│   │   ├── supabase/          # Supabase clients
│   │   ├── tenant-context/    # Tenant resolution
│   │   └── utils/             # Helpers
│   ├── themes/                # Theme components
│   │   ├── hexfashion/
│   │   ├── aromatic/
│   │   └── bookpoint/
│   ├── hooks/                 # Custom React hooks
│   └── types/                 # TypeScript types
├── supabase/
│   ├── migrations/            # Database migrations
│   └── seed.sql               # Seed data
├── public/                    # Static assets
├── .env.local                 # Environment variables (gitignored)
├── .env.example               # Example environment variables
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript configuration
├── next.config.js             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
└── README.md                  # This file
```

---

## 🛠️ Technology Stack

### Core
- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library

### Backend
- **Supabase** - PostgreSQL database + Auth + Storage
- **Prisma** - ORM for type-safe database access
- **Row-Level Security (RLS)** - Tenant data isolation

### Hosting
- **Vercel** - Multi-tenant platform
- **Vercel KV** - Redis caching
- **Vercel Edge** - Edge functions

### Additional
- **Zod** - Schema validation
- **React Hook Form** - Form handling
- **TanStack Query** - Data fetching
- **Stripe** - Payment processing

---

## 📚 Documentation

All documentation is in the [`../docs/`](../docs/) folder.

**Start Here:**
- **[Documentation Index](../docs/DOCUMENTATION_INDEX.md)** - Master index of all documentation

**Key Documents:**
- **[Migration Roadmap](../docs/NODEJS_MIGRATION_UPDATED.md)** - Complete 49-day migration roadmap
- **[Theme Architecture](../docs/THEME_ARCHITECTURE_GUIDE.md)** - Theme system architecture
- **[Database Architecture](../docs/DATABASE_ARCHITECTURE_OPTIONS.md)** - Single DB architecture
- **[Implementation Examples](../docs/NODEJS_IMPLEMENTATION_SUPABASE_VERCEL.md)** - Code examples

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase account
- Vercel account
- Git

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run database migrations
npx supabase migration up

# Start development server
npm run dev
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Vercel
VERCEL_URL=your-app.vercel.app
VERCEL_TOKEN=your-vercel-token

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📋 Development Roadmap

See `../NODEJS_MIGRATION_UPDATED.md` for the complete 49-day roadmap.

### Quick Overview:

**Week 1: Preparation**
- Architecture study
- Database schema design
- Project initialization

**Week 2-3: Foundation**
- Multi-tenancy core
- Theme system
- Authentication

**Week 4-6: Features**
- Products, Orders, Customers
- Payment integration
- Content management

**Week 7: Launch**
- Testing
- Documentation
- Deployment

---

## 🎨 Theme System

StoreFlow uses a **component-based theme architecture**.

- Each theme is a React component library
- Themes stored in `src/themes/`
- Tenant customizations via database
- See `../THEME_ARCHITECTURE_GUIDE.md` for details

---

## 🔒 Security

- **Row-Level Security (RLS)** - Automatic tenant data isolation
- **Content Security Policy (CSP)** - XSS protection
- **CSS Sanitization** - Safe custom CSS injection
- **Rate Limiting** - API protection
- **Input Validation** - Zod schemas

---

## 📝 License

[Your License Here]

---

## 🤝 Contributing

[Contributing Guidelines]

---

**Built with ❤️ for multi-tenant ecommerce**

