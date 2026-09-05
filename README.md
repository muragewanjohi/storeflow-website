# DukaNest - Multi-Tenant Ecommerce Platform
## Next.js + Supabase + Vercel

**Slogan:** "Start Your Store. Grow Your Business. It's That Simple."

---

## 📖 What is DukaNest?

DukaNest is a platform that lets you create and manage multiple online stores from one place. Think of it as a system where:

- **Platform Owners (Landlords)** can create and manage many different online stores
- **Store Owners (Tenants)** get their own complete online store with a unique web address (like `mystore.dukanest.com`)
- **Customers** can shop at any of these stores just like they would at any regular online store

### How It Works

1. **A business owner starts a free trial in minutes** - They register their store (now optimized for Google-first signup), choose a subdomain, and get instant dashboard access.
2. **DukaNest provisions the store automatically** - The tenant storefront, default Multipurpose theme, core pages, settings, and onboarding content are set up for them.
3. **The owner runs operations from one dashboard** - They manage products, inventory, orders, customers, promotions, content, and support from a single place.
4. **Customers shop on a branded storefront** - Each tenant has a fully functional online shop with catalog, cart, checkout, and payment flows.
5. **Data stays isolated and secure per tenant** - Auth, role checks, and tenant scoping ensure each store only accesses its own data.
6. **Analytics and notifications keep owners informed** - Real-time insights and alerting help owners make faster decisions and respond quickly.

### What Store Owners Can Do

- **Manage Catalog & Inventory** - Add/edit products, categories, attributes, variants, and stock with media uploads.
- **Run Order Operations** - Process orders, update statuses, handle delivery flows, and monitor payment states.
- **Built-In Sales & Promotions** - Run campaigns, promotions, and growth offers directly from the dashboard to increase conversions.
- **Understand Customers** - View customer profiles, order history, addresses, and engagement patterns.
- **Customize Storefront Experience** - Apply themes, tune branding, and configure storefront settings.
- **Publish Content & Campaigns** - Manage blogs, pages, forms, and sales/promotional campaigns.
- **Track Performance in Detail** - Monitor revenue, traffic, conversion, product performance, and real-time analytics.
- **Setup Delivery Zones** - Configure delivery areas, pricing logic, and fulfillment coverage for your store.
- **Manage Support & Operations** - Handle support tickets, settings, domains, and platform-facing workflows.

### What Makes DukaNest Special

- **Mobile-First Direction** - Built for the way your users already work (mostly on phones), with Flutter apps and offline-first sync on the roadmap.
- **Fast Onboarding** - Google-first registration with reduced friction gets new stores live quickly.
- **No Coding Required** - Owners can launch and run a full store from an intuitive dashboard.
- **Complete Commerce Stack** - Catalog, orders, customers, content, analytics, and payments in one platform.

- **Kenya-Ready Payments** - Native M-Pesa and Pesapal workflows for local market needs.
- **Secure Multi-Tenancy** - Strong tenant isolation, role-based access control, and robust auth/MFA patterns.
- **Scalable Platform Architecture** - Designed to support many independent stores on shared infrastructure.
- **Operational Visibility** - Rich analytics, notifications, and reporting for data-driven decisions.

In simple terms, DukaNest is like a shopping mall where each store is completely independent, but they all share the same infrastructure and management system behind the scenes.

---

## 🚀 Project Overview

DukaNest is a modern, multi-tenant ecommerce platform built with:
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
- **M-Pesa + Pesapal** - Payment processing (Kenya)

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

See [`docs/ROADMAP.md`](docs/ROADMAP.md) and [`docs/mobile-first-flutter-roadmap.md`](docs/mobile-first-flutter-roadmap.md) for full planning detail.

### ✅ Implemented Features (Current Codebase)

#### Multi-tenant Platform Core
- Tenant-per-subdomain architecture (`tenant.dukanest.com`) with tenant context resolution
- Tenant data isolation with Supabase/Postgres + Prisma + RLS patterns
- Landlord/admin capabilities for tenant and plan management
- Dynamic tenant routing for storefront and dashboard experiences

#### Authentication & Access Control
- Tenant and landlord auth flows
- Role-based access (`tenant_admin`, `tenant_staff`, `landlord`)
- MFA support for tenant and landlord login flows
- Trusted devices and password reset/account recovery flows
- Google-first registration UX with email/password fallback

#### Storefront (Customer-Facing)
- Tenant storefront pages and shared layout system
- Product catalog, categories, product detail, cart, checkout, and order tracking
- Blog/pages/forms rendering for tenant-managed content
- Theme-driven storefront customization

#### Dashboard (Store Owner)
- Product, category, attribute, inventory, and media management
- Order and customer management
- Sales/promotions and analytics pages
- Theme customization and preview flows
- Domain/settings/support/subscription management

#### Content & Marketing
- Blog and blog category management
- Page builder/content pages and form builder + submissions
- Social sharing + Open Graph/Twitter metadata integration

#### Analytics
- Tracking endpoints (sessions, page views, events)
- Dashboard analytics modules (overview, sales, revenue, traffic, customers, conversion, product performance, geographic, realtime)
- Export/report-related analytics capabilities

#### Payments & Billing
- M-Pesa subscription flows (initiate, callback, status)
- Pesapal subscription/callback/IPN flows
- Subscription lifecycle and scheduled downgrade/expiry processing

#### Notifications & Support
- In-app notification APIs and unread counts
- Customer/store support ticket flows and message threads
- Admin support ticket management tools

#### Platform Operations & Quality
- Type-check, lint, unit testing, Playwright e2e support
- Deployment verification/smoke test scripts
- Vercel-oriented multi-tenant deployment helpers

### 🚧 In Progress / Next Up

#### Immediate (Mobile-First Phase 1)
- Mobile-first registration optimization (Google-first, fewer fields, default Multipurpose theme)
- Mobile-first dashboard UX improvements (navigation + high-usage page optimization)
- Mobile API foundation (`/api/v1/mobile/*`) with standardized response envelope

#### Near-Term (Mobile App Foundation)
- Token-based mobile auth hardening and endpoint parity
- Push notification infrastructure (FCM device registration + dispatch)
- Sync API foundation for offline-capable clients

### 🧭 Planned Features (Mobile & Growth)

#### Flutter Apps
- Flutter Shop Owner app (Android + iOS) for core operations from phone
- Flutter Customer storefront app with checkout and order tracking

#### Offline-First Capability
- Local-first data caching on mobile
- Action queue and reconnect sync engine
- Conflict handling and retry/idempotency controls

#### PWA & Mobile Web
- Service worker, install prompt, and offline-safe web enhancements
- Improved mobile media/camera workflows for product creation

#### Business Growth Enhancements
- Deeper social commerce and channel integrations
- Additional automation/marketing tooling
- Ongoing analytics and operational reliability improvements

For priorities, sequencing, and implementation details, see:
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/mobile-first-flutter-roadmap.md`](docs/mobile-first-flutter-roadmap.md)

---

## 🎨 Theme System

DukaNest uses a **component-based theme architecture**.

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

