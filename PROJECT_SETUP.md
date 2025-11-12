# StoreFlow Project Setup Guide
## Initial Project Structure

This document outlines the initial setup for the StoreFlow Next.js project.

---

## 📁 Current Folder Structure

```
storeflow/
├── src/
│   ├── lib/
│   │   └── theme-engine/
│   │       └── ThemeProvider.tsx    ✅ Created
│   └── types/
│       └── theme.ts                ✅ Created
├── supabase/
│   └── migrations/
│       └── 001_create_theme_schema.sql  ✅ Created
├── README.md                       ✅ Created
├── .gitignore                     ✅ Created
└── PROJECT_SETUP.md               ✅ This file
```

---

## 🚀 Next Steps

### 1. Initialize Next.js Project

```bash
cd C:\xampp\htdocs\storeflow
npx create-next-app@latest . --typescript --app --tailwind --eslint --no-git
```

**Note:** We're using `--no-git` because you may already have a git repo. Adjust as needed.

### 2. Install Core Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @prisma/client prisma
npm install zod react-hook-form @hookform/resolvers
npm install @tanstack/react-query
npm install stripe @stripe/stripe-js
npm install @vercel/sdk
npm install @vercel/kv
```

### 3. Install Dev Dependencies

```bash
npm install -D @types/node @types/react @types/react-dom
npm install -D eslint-config-next
```

### 4. Set Up Prisma

```bash
npx prisma init
```

Update `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 5. Set Up Supabase

```bash
npm install -g supabase
supabase init
supabase link --project-ref your-project-ref
```

### 6. Create Environment File

Create `.env.local` (copy from `.env.example` when available):
```env
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
DATABASE_URL=your-database-url
```

---

## 📋 Folder Structure to Create

After Next.js initialization, your structure should be:

```
storeflow/
├── src/
│   ├── app/                      # Next.js app router (auto-created)
│   │   ├── (storefront)/         # Tenant storefront
│   │   │   └── [tenant]/
│   │   │       ├── layout.tsx
│   │   │       └── page.tsx
│   │   ├── (admin)/              # Admin dashboard
│   │   │   └── admin/
│   │   ├── api/                  # API routes
│   │   └── layout.tsx
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui components
│   │   └── shared/               # Shared components
│   ├── lib/                      # Utilities
│   │   ├── theme-engine/         ✅ Already created
│   │   ├── supabase/             # To create
│   │   ├── tenant-context/       # To create
│   │   └── utils/                 # To create
│   ├── themes/                   # Theme components
│   │   ├── hexfashion/           # To create
│   │   ├── aromatic/             # To create
│   │   └── bookpoint/            # To create
│   ├── hooks/                    # Custom hooks
│   └── types/                    ✅ Already created
├── supabase/                     ✅ Already created
│   └── migrations/
├── public/                       # Static assets
├── .env.local                    # Environment variables
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.ts
```

---

## ✅ Checklist

### Initial Setup
- [x] Create `storeflow/` folder
- [x] Create `README.md`
- [x] Create `.gitignore`
- [x] Create theme types (`src/types/theme.ts`)
- [x] Create theme provider (`src/lib/theme-engine/ThemeProvider.tsx`)
- [x] Create database migration (`supabase/migrations/001_create_theme_schema.sql`)
- [ ] Initialize Next.js project
- [ ] Install dependencies
- [ ] Set up Prisma
- [ ] Set up Supabase
- [ ] Create `.env.local`

### Next Phase (After Setup)
- [ ] Create tenant resolution middleware
- [ ] Set up Supabase clients
- [ ] Create first theme (HexFashion)
- [ ] Build theme registry
- [ ] Create admin dashboard structure
- [ ] Create storefront structure

---

## 📚 Documentation Reference

- **Migration Roadmap:** `../NODEJS_MIGRATION_UPDATED.md`
- **Theme Architecture:** `../THEME_ARCHITECTURE_GUIDE.md`
- **Code Examples:** `../NODEJS_IMPLEMENTATION_SUPABASE_VERCEL.md`
- **Documentation Index:** `../DOCUMENTATION_INDEX.md`

---

## 🎯 Quick Start Commands

```bash
# Navigate to project
cd C:\xampp\htdocs\storeflow

# Initialize Next.js (if not done)
npx create-next-app@latest . --typescript --app --tailwind --eslint

# Install dependencies
npm install

# Run migrations
npx supabase migration up

# Start dev server
npm run dev
```

---

**Ready to start building! 🚀**

