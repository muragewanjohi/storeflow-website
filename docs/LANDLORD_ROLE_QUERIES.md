# Landlord Role Management Queries

This document provides SQL queries for checking and assigning landlord roles to users.

## Important Notes

- **Landlord role is stored in Supabase Auth**, not in the `landlord_users` table
- The role is stored in `auth.users.raw_user_meta_data->>'role'` as JSON
- The `landlord_users` table is a separate table that may or may not be used
- Authentication checks `user_metadata.role` from Supabase Auth

---

## 1. Check if User is a Landlord

### Query 1: Check by Email (Supabase SQL)

```sql
-- Check if user exists and what role they have
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data as full_metadata,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'safarimaps254@gmail.com';
```

### Query 2: Check All Landlords

```sql
-- List all users with landlord role
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'name' as name,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'landlord'
ORDER BY created_at DESC;
```

### Query 3: Check if Specific User is Landlord

```sql
-- Quick check: returns true/false
SELECT 
  email,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'landlord' THEN true
    ELSE false
  END as is_landlord,
  raw_user_meta_data->>'role' as current_role
FROM auth.users
WHERE email = 'safarimaps254@gmail.com';
```

---

## 2. Make User a Landlord

### Option A: Update Existing Metadata (Recommended - Preserves Other Fields)

```sql
-- Update user to landlord role (preserves other metadata)
UPDATE auth.users
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "landlord"}'::jsonb,
  updated_at = NOW()
WHERE email = 'safarimaps254@gmail.com';
```

### Option B: Update with Name (if name exists in metadata)

```sql
-- Update role and preserve name
UPDATE auth.users
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', 'landlord',
      'name', COALESCE(raw_user_meta_data->>'name', 'Admin')
    ),
  updated_at = NOW()
WHERE email = 'safarimaps254@gmail.com';
```

### Option C: Replace Entire Metadata (Removes Other Fields - Use with Caution)

```sql
-- Replace entire metadata (removes other fields)
UPDATE auth.users
SET 
  raw_user_meta_data = '{"role": "landlord"}'::jsonb,
  updated_at = NOW()
WHERE email = 'safarimaps254@gmail.com';
```

---

## 3. Complete Script for safarimaps254@gmail.com

Run this complete script in Supabase SQL Editor:

```sql
-- ============================================
-- Assign Landlord Role to safarimaps254@gmail.com
-- ============================================

-- Step 1: Check if user exists and current status
DO $$
DECLARE
  user_email TEXT := 'safarimaps254@gmail.com';
  user_exists BOOLEAN;
  current_role TEXT;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = user_email) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'User with email % does not exist in Supabase Auth', user_email;
  END IF;
  
  -- Get current role
  SELECT raw_user_meta_data->>'role' INTO current_role
  FROM auth.users
  WHERE email = user_email;
  
  RAISE NOTICE '✅ User found: %', user_email;
  RAISE NOTICE '📋 Current role: %', COALESCE(current_role, 'none (will be set to landlord)');
  
  -- Update role
  UPDATE auth.users
  SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "landlord"}'::jsonb,
    updated_at = NOW()
  WHERE email = user_email;
  
  RAISE NOTICE '✅ Landlord role assigned successfully!';
END $$;

-- Step 2: Verify the update
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data as full_metadata,
  updated_at
FROM auth.users
WHERE email = 'safarimaps254@gmail.com';
```

---

## 4. Using Prisma (Node.js/TypeScript)

If you want to check/update using Prisma in your code:

### Check User Role (Note: Prisma can't directly access auth.users)

Since Prisma can't directly access Supabase Auth tables, you need to use Supabase Admin API:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key (admin)
);

// Check user role
async function checkUserRole(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error) throw error;
  
  const user = data.users.find(u => u.email === email);
  
  if (!user) {
    return { exists: false };
  }
  
  return {
    exists: true,
    role: user.user_metadata?.role || null,
    email: user.email,
  };
}

// Update user role
async function setLandlordRole(email: string) {
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const user = users.users.find(u => u.email === email);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    {
      user_metadata: {
        ...user.user_metadata,
        role: 'landlord',
      },
    }
  );
  
  if (error) throw error;
  return data;
}
```

---

## 5. Quick Verification Queries

### Verify safarimaps254@gmail.com is Landlord

```sql
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'landlord' THEN '✅ IS LANDLORD'
    ELSE '❌ NOT LANDLORD'
  END as status
FROM auth.users
WHERE email = 'safarimaps254@gmail.com';
```

### List All Users and Their Roles

```sql
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'name' as name,
  email_confirmed_at IS NOT NULL as email_verified,
  created_at
FROM auth.users
ORDER BY created_at DESC;
```

---

## 6. Troubleshooting

### If User Doesn't Exist

If the user doesn't exist in `auth.users`, you need to create them first:

1. **Via Supabase Dashboard:**
   - Go to Authentication → Users → Add User
   - Enter email and password
   - In User Metadata, add: `{"role": "landlord"}`

2. **Via API:**
   ```bash
   curl -X POST https://your-project.supabase.co/auth/v1/admin/users \
     -H "apikey: YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "safarimaps254@gmail.com",
       "password": "YourPassword123!",
       "user_metadata": {"role": "landlord"}
     }'
   ```

### If Update Doesn't Work

1. **Check Permissions:** Make sure you're using service role key or have admin access
2. **Clear Cache:** After updating, clear browser cache and cookies
3. **Wait a Few Seconds:** Supabase may take a moment to sync metadata
4. **Verify Update:** Run the verification query to confirm the role was set

---

## 7. Using the Existing Script

You can also use the existing TypeScript script:

```bash
cd storeflow
npx tsx scripts/fix-landlord-role.ts safarimaps254@gmail.com
```

This script will:
- Find the user by email
- Update the role to 'landlord'
- Preserve existing metadata
- Show confirmation

---

## Summary

**To make safarimaps254@gmail.com a landlord, run this in Supabase SQL Editor:**

```sql
UPDATE auth.users
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "landlord"}'::jsonb,
  updated_at = NOW()
WHERE email = 'safarimaps254@gmail.com';
```

**To verify:**

```sql
SELECT 
  email,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'safarimaps254@gmail.com';
```

Expected result: `role` should be `landlord`

