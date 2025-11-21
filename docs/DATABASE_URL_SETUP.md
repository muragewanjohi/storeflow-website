# Database URL Configuration Guide

## Overview

Supabase provides two types of database connections:

1. **Pooled Connection** (`DATABASE_URL`) - For regular queries
2. **Direct Connection** (`DIRECT_URL`) - For migrations

## Why Two URLs?

### Pooled Connection (DATABASE_URL)
- **Port**: `6543`
- **Use for**: Regular application queries
- **Benefits**: 
  - Connection pooling (more efficient)
  - Better for high-traffic applications
  - Handles many concurrent connections
- **Limitation**: Cannot run migrations (pgbouncer doesn't support certain operations)

### Direct Connection (DIRECT_URL)
- **Port**: `5432`
- **Use for**: Prisma migrations, schema changes
- **Benefits**:
  - Full PostgreSQL feature support
  - Required for migrations
  - Direct database access
- **Note**: Use sparingly (not for regular queries)

## Setup

### Step 1: Get Your Connection Strings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string**
5. Select **ORMs** tab → **Prisma**

You'll see two URLs:

**Pooled (for queries):**
```
postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Direct (for migrations):**
```
postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

### Step 2: Add to `.env.local`

```env
# Pooled connection - for regular queries
DATABASE_URL=postgresql://postgres.gtybtfngnggakrsbtrfw:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct connection - for migrations
DIRECT_URL=postgresql://postgres.gtybtfngnggakrsbtrfw:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

**Important:** Replace `[YOUR-PASSWORD]` with your actual database password!

### Step 3: Verify Configuration

Your `prisma/schema.prisma` should have:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // Pooled for queries
  directUrl = env("DIRECT_URL")        // Direct for migrations
}
```

## Usage

### Running Migrations

```bash
# Prisma will automatically use DIRECT_URL for migrations
npx prisma migrate dev
npx prisma migrate deploy
```

### Regular Queries

Your application code uses `DATABASE_URL` automatically through Prisma Client.

## Troubleshooting

### Error: "Can't reach database server at port 5432"

**Solution:**
1. Make sure `DIRECT_URL` is set in `.env.local`
2. Verify the password is correct
3. Check that you're using port `5432` (not `6543`) for `DIRECT_URL`
4. Ensure your IP is allowed in Supabase (Settings → Database → Connection pooling → Allowed IPs)

### Error: "Connection pooler timeout"

**Solution:**
- This usually happens when using pooled connection for migrations
- Make sure `DIRECT_URL` is configured and Prisma is using it for migrations

### Migration Fails

**Solution:**
1. Check `DIRECT_URL` is set correctly
2. Verify you're using port `5432` (direct connection)
3. Ensure your database password is correct
4. Check Supabase dashboard for connection issues

## Quick Reference

| Operation | Use This URL | Port |
|-----------|--------------|------|
| Application queries | `DATABASE_URL` | 6543 |
| Prisma migrations | `DIRECT_URL` | 5432 |
| Prisma Studio | `DATABASE_URL` | 6543 |
| Database tools | `DIRECT_URL` | 5432 |

## Security Notes

- **Never commit** `.env.local` to version control
- Store passwords securely
- Use environment variables in production (Vercel, etc.)
- Rotate passwords regularly

