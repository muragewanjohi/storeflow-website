# Local Development Setup Guide

**Setting up StoreFlow for local development and testing**

---

## 🚀 Quick Start

### 1. Environment Variables

Create `.env.local` file (copy from `env.template`):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=your-database-url

# Vercel (for domain management - optional for local dev)
VERCEL_TOKEN=your-vercel-token
VERCEL_PROJECT_ID=your-project-id

# Local Development
DEFAULT_TENANT_SUBDOMAIN=teststore  # Default tenant for localhost

# KV Cache (optional - leave as placeholder if not using)
KV_REST_API_URL=your-kv-instance.upstash.io
KV_REST_API_TOKEN=your-kv-token
```

**Important:** If you're not using Vercel KV, leave the KV variables as placeholders. The code will skip KV and use in-memory cache.

### 2. Create Test Tenant

You need at least one tenant in your database for testing.

#### Option A: Using Prisma Studio

```bash
npm run db:studio
```

1. Open `http://localhost:5555`
2. Go to `tenants` table
3. Click **Add record**
4. Fill in:
   - `id`: Generate UUID or use `gen_random_uuid()`
   - `subdomain`: `teststore` (or match `DEFAULT_TENANT_SUBDOMAIN`)
   - `name`: `Test Store`
   - `status`: `active`
   - `created_at`: `NOW()`
   - `updated_at`: `NOW()`

#### Option B: Using SQL

```sql
INSERT INTO tenants (
  id,
  subdomain,
  name,
  status,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'teststore',
  'Test Store',
  'active',
  NOW(),
  NOW()
);
```

#### Option C: Using Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Table Editor** → `tenants`
4. Click **Insert row**
5. Fill in the fields as above

### 3. Access Your Application

#### Option 1: Using localhost (Default Tenant)

If you set `DEFAULT_TENANT_SUBDOMAIN=teststore` in `.env.local`:

```
http://localhost:3000
```

The app will use the tenant with subdomain `teststore`.

#### Option 2: Using Subdomain (Recommended)

For better testing, use subdomain format:

**Windows (hosts file):**
1. Open `C:\Windows\System32\drivers\etc\hosts` as Administrator
2. Add:
   ```
   127.0.0.1 teststore.localhost
   ```
3. Access: `http://teststore.localhost:3000`

**macOS/Linux (hosts file):**
1. Edit `/etc/hosts`:
   ```bash
   sudo nano /etc/hosts
   ```
2. Add:
   ```
   127.0.0.1 teststore.localhost
   ```
3. Access: `http://teststore.localhost:3000`

---

## 🧪 Testing API Endpoints

### Using Postman

1. **Import Collection:**
   - Import `postman/StoreFlow_API_Collection.json`
   - Import `postman/StoreFlow_Environment.json`

2. **Set Environment:**
   - Select **StoreFlow Environment**
   - Set `base_url` to `http://localhost:3000`

3. **Test Endpoints:**
   - Start dev server: `npm run dev`
   - Run requests from Postman

### Using PowerShell/curl

```powershell
# Get current tenant
Invoke-RestMethod -Uri "http://localhost:3000/api/tenant/current" -Method GET

# Add domain (requires tenant)
$headers = @{ "Content-Type" = "application/json" }
$body = @{ domain = "test.example.com" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/domains" `
  -Method POST -Headers $headers -Body $body
```

---

## 🐛 Troubleshooting

### Issue: "Tenant not found"

**Solution:**
1. Check if tenant exists in database
2. Verify `subdomain` matches `DEFAULT_TENANT_SUBDOMAIN` (for localhost)
3. Or use subdomain format: `teststore.localhost:3000`

### Issue: "KV cache error"

**Solution:**
- This is **not an error** - it's expected if KV is not configured
- The code will fall back to in-memory cache
- To fix the log message, either:
  - Configure real KV credentials, OR
  - Leave KV variables as placeholders (code will skip KV)

### Issue: "Cannot connect to database"

**Solution:**
1. Check `DATABASE_URL` in `.env.local`
2. Verify Supabase project is active
3. Check network connection

### Issue: "401 Unauthorized" or "403 Forbidden"

**Solution:**
- Authentication not implemented yet (Day 12)
- For now, ensure tenant context is set via middleware
- Use subdomain format for proper tenant resolution

---

## 📝 Development Workflow

### Daily Development

1. **Start Dev Server:**
   ```bash
   npm run dev
   ```

2. **Access Application:**
   - Use `http://teststore.localhost:3000` (recommended)
   - Or `http://localhost:3000` (uses default tenant)

3. **Test Changes:**
   - Use Postman collection
   - Or browser for UI testing

### Before Committing

1. **Run Tests:**
   ```bash
   npm run type-check
   npm run lint
   ```

2. **Check Database:**
   - Verify no test data in production tables
   - Clean up test tenants if needed

---

## 🔧 Advanced Configuration

### Multiple Test Tenants

Create multiple tenants for testing:

```sql
-- Test Store 1
INSERT INTO tenants (id, subdomain, name, status, created_at, updated_at)
VALUES (gen_random_uuid(), 'store1', 'Store 1', 'active', NOW(), NOW());

-- Test Store 2
INSERT INTO tenants (id, subdomain, name, status, created_at, updated_at)
VALUES (gen_random_uuid(), 'store2', 'Store 2', 'active', NOW(), NOW());
```

Add to hosts file:
```
127.0.0.1 store1.localhost
127.0.0.1 store2.localhost
```

### Custom Port

If using a different port:

```env
# .env.local
PORT=3001
```

Access: `http://teststore.localhost:3001`

---

## ✅ Checklist

- [ ] `.env.local` created with all required variables
- [ ] Test tenant created in database
- [ ] `DEFAULT_TENANT_SUBDOMAIN` set (for localhost access)
- [ ] Hosts file updated (for subdomain access)
- [ ] Dev server starts without errors
- [ ] Can access application
- [ ] API endpoints work
- [ ] Postman collection imported and configured

---

**Happy Coding! 🚀**

