# Assign Landlord Role via Database

**Last Updated:** 2024

---

## Problem

You're getting "Access denied - This account does not have landlord privileges" when trying to log in as a landlord.

**Root Cause:** The user's `user_metadata.role` in Supabase Auth is not set to `'landlord'`.

---

## Solution: Update via Database

### Step 1: Find the User

First, find the user in Supabase Auth's `auth.users` table:

```sql
-- Find user by email
SELECT 
  id,
  email,
  raw_user_meta_data,
  raw_app_meta_data,
  created_at
FROM auth.users
WHERE email = 'storeflowltd@gmail.com';
```

**Expected Output:**
```
id: <uuid>
email: storeflowltd@gmail.com
raw_user_meta_data: {"name": "...", "role": "..."} or NULL
raw_app_meta_data: {...}
created_at: <timestamp>
```

### Step 2: Check Current Role

Check what role (if any) is currently set:

```sql
SELECT 
  email,
  raw_user_meta_data->>'role' as current_role,
  raw_user_meta_data as full_metadata
FROM auth.users
WHERE email = 'storeflowltd@gmail.com';
```

### Step 3: Update User Metadata to Assign Landlord Role

**Option A: Update existing metadata (preserves other fields)**

```sql
UPDATE auth.users
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "landlord"}'::jsonb,
  updated_at = NOW()
WHERE email = 'storeflowltd@gmail.com';
```

**Option B: Set role and name (if name exists)**

```sql
UPDATE auth.users
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', 'landlord',
      'name', COALESCE(raw_user_meta_data->>'name', 'Admin')
    ),
  updated_at = NOW()
WHERE email = 'storeflowltd@gmail.com';
```

**Option C: Replace entire metadata (removes other fields)**

```sql
UPDATE auth.users
SET 
  raw_user_meta_data = '{"role": "landlord", "name": "Admin"}'::jsonb,
  updated_at = NOW()
WHERE email = 'storeflowlrd@gmail.com';
```

**⚠️ Recommended: Use Option A** - It preserves existing metadata fields.

### Step 4: Verify the Update

```sql
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data as full_metadata
FROM auth.users
WHERE email = 'storeflowltd@gmail.com';
```

**Expected Output:**
```
email: storeflowltd@gmail.com
role: landlord
name: <name or NULL>
full_metadata: {"role": "landlord", "name": "..."}
```

---

## Assign Landlord Role to Multiple Users

If you need to assign landlord role to multiple users:

```sql
-- Update multiple users by email list
UPDATE auth.users
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "landlord"}'::jsonb,
  updated_at = NOW()
WHERE email IN (
  'admin1@example.com',
  'admin2@example.com',
  'storeflowltd@gmail.com'
);
```

---

## Create New Landlord User (if user doesn't exist)

If the user doesn't exist in Supabase Auth, you need to create them. However, **you cannot create users directly in the database** because:

1. Supabase Auth requires password hashing
2. Auth triggers need to run
3. Security policies must be applied

**Instead, use one of these methods:**

### Method 1: Use the Registration API

```bash
curl -X POST http://localhost:3000/api/auth/landlord/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newlandlord@example.com",
    "password": "SecurePassword123!",
    "name": "New Landlord"
  }'
```

### Method 2: Use Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create new user"
3. Enter email and password
4. In "User Metadata", add:
   ```json
   {
     "role": "landlord",
     "name": "Landlord Name"
   }
   ```

### Method 3: Use the Fix Script

```bash
# First create user via Supabase Dashboard or API
# Then run:
npx tsx scripts/fix-landlord-role.ts newlandlord@example.com
```

---

## Complete SQL Script

Here's a complete script you can run in Supabase SQL Editor:

```sql
-- ============================================
-- Assign Landlord Role to User
-- ============================================

-- Step 1: Check if user exists
DO $$
DECLARE
  user_email TEXT := 'storeflowltd@gmail.com';
  user_exists BOOLEAN;
  current_role TEXT;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = user_email) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'User with email % does not exist', user_email;
  END IF;
  
  -- Get current role
  SELECT raw_user_meta_data->>'role' INTO current_role
  FROM auth.users
  WHERE email = user_email;
  
  RAISE NOTICE 'User found: %', user_email;
  RAISE NOTICE 'Current role: %', COALESCE(current_role, 'none');
  
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
  updated_at
FROM auth.users
WHERE email = 'storeflowltd@gmail.com';
```

---

## Troubleshooting

### Issue: "User not found"

**Solution:** The user doesn't exist in Supabase Auth. Create them first using one of the methods above.

### Issue: "Permission denied" when updating auth.users

**Solution:** You need to use a service role key or have admin access to Supabase. In Supabase Dashboard:
1. Go to Settings → API
2. Use the "service_role" key (not the anon key)
3. Or use Supabase SQL Editor (which has admin access)

### Issue: Role updated but still can't login

**Possible causes:**
1. **Cache:** Clear browser cache and cookies, try again
2. **Wrong email:** Verify you're using the correct email
3. **Password wrong:** The role is correct, but password is wrong
4. **User metadata not syncing:** Wait a few seconds and try again

**Check:**
```sql
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  email_confirmed_at,
  banned_until
FROM auth.users
WHERE email = 'storeflowltd@gmail.com';
```

### Issue: Need to check all landlord users

```sql
-- List all users with landlord role
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'name' as name,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'landlord'
ORDER BY created_at DESC;
```

---

## Quick Reference

### Assign Landlord Role (One User)
```sql
UPDATE auth.users
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "landlord"}'::jsonb,
  updated_at = NOW()
WHERE email = 'your-email@example.com';
```

### Check User Role
```sql
SELECT 
  email,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'your-email@example.com';
```

### List All Landlords
```sql
SELECT email, raw_user_meta_data->>'name' as name
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'landlord';
```

### Remove Landlord Role
```sql
UPDATE auth.users
SET 
  raw_user_meta_data = raw_user_meta_data - 'role',
  updated_at = NOW()
WHERE email = 'your-email@example.com';
```

---

## Alternative: Use the Script (Easier)

If you prefer not to use SQL, you can use the existing script:

```bash
npx tsx scripts/fix-landlord-role.ts storeflowltd@gmail.com
```

This script:
- Finds the user by email
- Updates the role to 'landlord'
- Preserves existing metadata
- Shows confirmation

---

**Last Updated:** 2024
