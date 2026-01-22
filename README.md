# StoreFlow - Multi-Tenant Ecommerce Platform
## Next.js + Supabase + Vercel

**Slogan:** "Start Your Store. Grow Your Business. It's That Simple."

---

## 📖 What is StoreFlow?

StoreFlow is a platform that lets you create and manage multiple online stores from one place. Think of it as a system where:

- **Platform Owners (Landlords)** can create and manage many different online stores
- **Store Owners (Tenants)** get their own complete online store with a unique web address (like `mystore.dukanest.com`)
- **Customers** can shop at any of these stores just like they would at any regular online store

### How It Works

1. **A platform owner creates a new store** - They set up a store for a business owner, choose a name and web address
2. **The store owner gets their own dashboard** - They can add products, manage orders, see customers, and customize their store's appearance
3. **Customers visit the store** - They see a fully functional online store where they can browse products, add items to cart, and make purchases
4. **Everything is separate and secure** - Each store's data is completely isolated, so store owners can only see and manage their own products, orders, and customers

### What Store Owners Can Do

- **Manage Products** - Add, edit, and organize products with images, descriptions, and prices
- **Handle Orders** - Process orders, update shipping status, and manage inventory
- **Track Customers** - See customer information, order history, and manage customer accounts
- **Customize Their Store** - Choose from different themes, customize colors and fonts, and create custom pages
- **Manage Content** - Create blog posts, custom pages, and forms for their store
- **View Analytics** - See sales reports, revenue trends, and customer insights

### What Makes StoreFlow Special

- **No Coding Required** - Store owners can set up and manage their entire store through an easy-to-use dashboard
- **Multiple Themes** - Choose from pre-designed themes that work for different types of businesses (fashion, electronics, groceries, etc.)
- **Complete Ecommerce Features** - Everything needed to run an online store: products, shopping cart, checkout, payments, and order management
- **Secure & Isolated** - Each store's data is completely separate and secure, so there's no risk of one store seeing another's information
- **Scalable** - The platform can handle thousands of stores, each with their own products, customers, and orders

In simple terms, StoreFlow is like a shopping mall where each store is completely independent, but they all share the same infrastructure and management system behind the scenes.

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
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library (optional)

### Backend
- **Supabase** - PostgreSQL database + Auth + Storage
- **Prisma** - ORM for type-safe database access
- **Row-Level Security (RLS)** - Tenant data isolation

### Hosting
- **Vercel** - Multi-tenant platform
- **Vercel KV** - Redis caching (optional)
- **Vercel Edge** - Edge functions

### Additional
- **Zod** - Schema validation
- **React Hook Form** - Form handling
- **TanStack Query** - Data fetching
- **Pesapal** - Payment processing (Kenya)

---

## 📚 Documentation

**Project Documentation:**
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete development setup guide ⭐ **Start here!**
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System architecture and design patterns
- **[AI_PROMPT_LIBRARY.md](./docs/AI_PROMPT_LIBRARY.md)** - AI assistant prompts and context
- **[SECURITY.md](./docs/SECURITY.md)** - Row-Level Security (RLS) implementation guide
- **[PRISMA_EXPLANATION.md](./docs/PRISMA_EXPLANATION.md)** - Prisma ORM guide
- **[POSTMAN_COLLECTION_GUIDE.md](./docs/POSTMAN_COLLECTION_GUIDE.md)** - API testing with Postman
- **[GOOGLE_MAPS_SETUP.md](./docs/GOOGLE_MAPS_SETUP.md)** - Google Maps API setup for address autocomplete

**External Documentation:**
All migration and planning docs are in the [`../docs/`](../docs/) folder.

**Start Here:**
- **[Documentation Index](../docs/DOCUMENTATION_INDEX.md)** - Master index of all documentation
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Setup and development guide

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
Copy-Item env.template .env.local
# Edit .env.local with your Supabase credentials
# See docs/ENV_SETUP_GUIDE.md for detailed instructions

# Run database migrations
npx supabase migration up

# Start development server
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
Copy-Item .env.example .env.local
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed setup instructions.

**Required Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only!)
- `DATABASE_URL` - PostgreSQL connection string

---

## 📋 Development Roadmap

See [`../docs/NODEJS_MIGRATION_UPDATED.md`](../docs/NODEJS_MIGRATION_UPDATED.md) for the complete 49-day roadmap.

### Current Status: Day 7 Complete ✅

**Completed:**
- ✅ Project initialization (Day 6)
- ✅ Development tools setup (Day 7)
- ✅ Documentation created (Day 7)

**Next Steps:**
- Day 8: Database schema design
- Day 9: Row-Level Security setup
- Day 10: Tenant resolution system

### Quick Overview:

**Week 1: Preparation** ✅
- Architecture study
- Database schema design
- Project initialization
- Development tools

**Week 2-3: Foundation** (Upcoming)
- Multi-tenancy core
- Authentication
- Tenant management

**Week 4-6: Features** (Planned)
- Products, Orders, Customers
- Payment integration
- Content management

**Week 7: Launch** (Planned)
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

