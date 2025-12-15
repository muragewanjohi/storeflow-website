# RLS Table Classification Guide

**Which tables should have RLS enabled vs. remain unrestricted?**

---

## ✅ Tables WITH RLS (Tenant-Scoped)

These tables have `tenant_id` and should have RLS enabled:

### Core Ecommerce
- `products` ✅
- `orders` ✅
- `order_products` ✅
- `customers` ✅
- `categories` ✅
- `product_categories` ✅

### Content Management
- `pages` ✅
- `blogs` ✅
- `blog_categories` ✅

### Product Management
- `product_variants` ✅
- `product_reviews` ✅
- `product_wishlists` ✅
- `product_variant_attributes` ✅
- `attributes` ✅
- `attribute_values` ✅
- `brands` ✅

### Shopping
- `cart_items` ✅
- `coupons` ✅

### Customer Management
- `user_delivery_addresses` ✅
- `wallets` ✅

### Support
- `support_tickets` ✅
- `support_ticket_messages` ✅

### Media & Configuration
- `media_uploads` ✅
- `static_options` ✅

### Forms
- `form_builders` ✅
- `form_submissions` ✅

### Inventory
- `inventory_history` ✅

### Payments
- `payment_logs` ✅

### Themes
- `tenant_themes` ✅ (links tenants to themes)

### Location (Optional tenant_id)
- `cities` ✅ (tenant_id is optional - NULL allowed)
- `countries` ✅ (tenant_id is optional - NULL allowed)
- `states` ✅ (tenant_id is optional - NULL allowed)

---

## ❌ Tables WITHOUT RLS (Central/Landlord - UNRESTRICTED)

These tables do NOT have `tenant_id` and should remain **UNRESTRICTED**:

### Central Registry
- `tenants` ❌ (Central - tenant registry)
- `price_plans` ❌ (Central - subscription plans)
- `themes` ❌ (Central - theme registry)
- `plugins` ❌ (Central - plugin registry)
- `custom_domains` ❌ (Central - domain management)

### Landlord/Admin
- `admins` ❌ (Landlord - admin users)
- `landlord_users` ❌ (Landlord - landlord users)
- `landlord_support_tickets` ❌ (Landlord - support tickets)
- `landlord_support_ticket_messages` ❌ (Landlord - support messages)

**Note:** These tables are intentionally unrestricted because:
1. They're shared across all tenants (central tables)
2. They're landlord-only (admin tables)
3. They don't contain tenant-specific data

---

## 🔍 How to Verify

### Check RLS Status

```sql
-- Check all tenant-scoped tables
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    -- Tenant-scoped tables
    'products', 'orders', 'customers', 'categories',
    'form_builders', 'form_submissions', 'inventory_history',
    'product_variant_attributes', 'tenant_themes'
  )
ORDER BY tablename;

-- Should all show: rls_enabled = true
```

### Check Central Tables (Should be UNRESTRICTED)

```sql
-- Check central/landlord tables
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    -- Central/Landlord tables
    'tenants', 'price_plans', 'themes', 'plugins',
    'admins', 'landlord_users', 'custom_domains'
  )
ORDER BY tablename;

-- Should all show: rls_enabled = false (UNRESTRICTED)
```

---

## 📋 Migration Checklist

After applying migrations, verify:

- [ ] All tenant-scoped tables have RLS enabled
- [ ] All tenant-scoped tables have RLS policies
- [ ] Central tables remain unrestricted (no RLS)
- [ ] Landlord tables remain unrestricted (no RLS)
- [ ] Run `npm run deploy:verify-rls` - should show all tenant tables with RLS enabled

---

## 🚨 Important Notes

1. **Service Role Key Bypasses RLS**
   - The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS policies
   - Only use service role key in server-side code
   - Never expose in client-side code

2. **Central Tables Don't Need RLS**
   - Tables like `tenants`, `themes`, `price_plans` are shared
   - They're protected by application-level authentication
   - RLS would break cross-tenant queries (analytics, etc.)

3. **Landlord Tables Don't Need RLS**
   - Tables like `admins`, `landlord_users` are landlord-only
   - Protected by application-level role-based access control
   - RLS not needed since they don't have tenant_id

---

## 📚 Related Documentation

- [RLS Migration Guide](./APPLY_RLS_MIGRATION_GUIDE.md)
- [Security Guide](./SECURITY.md)
- [RLS Migration File](../supabase/migrations/002_setup_rls_policies.sql)
- [Additional RLS Migration](../supabase/migrations/010_enable_rls_all_tenant_tables.sql)

---

**Last Updated:** 2024
