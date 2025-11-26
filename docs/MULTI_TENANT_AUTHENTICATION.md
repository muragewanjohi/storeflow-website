# Multi-Tenant Authentication Architecture

## Overview

The system uses **two separate authentication systems** that operate independently:

1. **Tenant Users (Store Admins)** - Supabase Auth (Global)
2. **Customers** - Custom Authentication (Per-Tenant)

## Architecture Details

### 1. Tenant Users (Store Admins)

**System:** Supabase Authentication (Global)
- **Storage:** Supabase `auth.users` table (managed by Supabase)
- **Scope:** GLOBAL - One email = One Supabase account across entire platform
- **Purpose:** Store owners, admins, staff who manage stores
- **Registration:** `/api/auth/tenant/register`
- **Login:** `/api/auth/tenant/login`

**Key Constraint:**
- Supabase enforces **one email = one account globally**
- If you register as tenant admin with `user@gmail.com`, that email is taken in Supabase
- You **cannot** register as tenant admin on another store with the same email

### 2. Customers

**System:** Custom Authentication (Per-Tenant)
- **Storage:** `customers` table in your database
- **Scope:** PER-TENANT - Same email can exist in different tenants
- **Purpose:** End customers who shop on tenant stores
- **Registration:** `/api/customers/auth/register`
- **Login:** `/api/customers/auth/login`

**Key Constraint:**
```prisma
model customers {
  tenant_id String @db.Uuid
  email     String @db.VarChar(255)
  
  @@unique([tenant_id, email])  // Same email OK in different tenants!
}
```

This means:
- ✅ Same email can be a customer in Tenant A
- ✅ Same email can be a customer in Tenant B
- ❌ Same email cannot be a customer twice in the SAME tenant

## Your Scenario

**Question:** If I register as a tenant (store owner) using Gmail, can I also register as a customer on another tenant's store using the same Gmail?

**Answer: YES! ✅**

Here's why:

1. **As Tenant Admin:**
   - Your Gmail is stored in Supabase `auth.users` (global)
   - You can manage your store's dashboard
   - This is separate from customer authentication

2. **As Customer:**
   - Your Gmail can be registered in the `customers` table for Tenant B
   - This is a completely separate record
   - The unique constraint `[tenant_id, email]` allows this
   - You'll have a separate password for customer account

## Example Flow

```
Scenario: user@gmail.com wants to be both tenant admin and customer

Step 1: Register as Tenant Admin (Store Owner)
  → Creates Supabase user: user@gmail.com
  → Can manage Store A dashboard
  → Uses Supabase auth

Step 2: Register as Customer on Store B
  → Creates customer record:
     - tenant_id: Store B's ID
     - email: user@gmail.com
     - password: (different password)
  → Can shop on Store B
  → Uses custom customer auth

Result: ✅ Works perfectly!
  - Same email, different systems
  - Different passwords
  - Different roles
```

## Important Notes

### Separation of Concerns

1. **Tenant Admin Authentication:**
   - Uses Supabase (global)
   - One email = one Supabase account
   - Access: `/dashboard` (tenant admin area)

2. **Customer Authentication:**
   - Uses custom system (per-tenant)
   - Same email can exist in multiple tenants
   - Access: `/account` (customer area)

### Security Considerations

1. **Different Passwords:**
   - Tenant admin password (Supabase)
   - Customer password (customers table)
   - These are completely separate

2. **Session Management:**
   - Tenant admin: Supabase session
   - Customer: Cookie-based session (`customer_session` cookie)

3. **No Cross-Contamination:**
   - Being a tenant admin does NOT give you customer access
   - Being a customer does NOT give you tenant admin access
   - They are isolated systems

## Edge Cases

### What if you try to register as customer with same email in same tenant?

**Answer:** ❌ Will fail
- The `@@unique([tenant_id, email])` constraint prevents this
- Error: "Customer with this email already exists"

### What if you're logged in as tenant admin and try to access customer account?

**Answer:** ❌ Will redirect to customer login
- Customer authentication requires customer session cookie
- Supabase auth (tenant admin) is NOT used for customer access
- You must login separately as a customer

### Can a tenant admin also be a customer in their own store?

**Answer:** ✅ Yes, but requires separate registration
- Register as tenant admin (Supabase)
- Register separately as customer (customers table)
- Use different passwords
- Access different areas:
  - `/dashboard` - Tenant admin (Supabase auth)
  - `/account` - Customer (customer session)

## Best Practices

1. **Use Different Passwords:**
   - Tenant admin password (for store management)
   - Customer password (for shopping)
   - This provides better security isolation

2. **Clear Separation:**
   - Tenant admin = Business owner role
   - Customer = End user role
   - Keep these separate for security

3. **Email Verification:**
   - Both systems support email verification
   - Verify both accounts separately

## Summary

✅ **YES, you can use the same Gmail for:**
- Tenant admin on Store A (Supabase auth)
- Customer on Store B (customers table)
- Customer on Store C (customers table)
- Customer on Store D (customers table)
- etc.

❌ **NO, you cannot use the same Gmail for:**
- Multiple tenant admin accounts (Supabase is global)
- Multiple customer accounts in the SAME tenant

The system is designed to allow maximum flexibility while maintaining proper isolation between tenant admin and customer roles.

