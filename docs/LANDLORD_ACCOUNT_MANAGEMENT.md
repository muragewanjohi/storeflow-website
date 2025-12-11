# Landlord Account Management Guide

This guide explains how to find and manage landlord (admin) accounts for testing and development.

## Understanding Landlord Accounts

Landlord accounts are stored in **Supabase Auth** (not in the Prisma `admins` table). They are created with:
- Email and password authentication
- Role metadata set to `'landlord'`
- Access to `/admin/*` routes

## Finding Landlord Account Email

### Method 1: Using the Script (Recommended)

Run the find script to list all landlord accounts:

```bash
cd storeflow
npx tsx scripts/find-landlord-account.ts
```

This will:
- List all landlord accounts with their emails
- Show account details (ID, name, creation date)
- Provide instructions for creating accounts if none exist

### Method 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Look for users with `role: landlord` in their metadata
4. The email address is shown in the user list

### Method 3: Using Prisma Studio (if you have direct DB access)

```bash
npx prisma studio
```

Note: Landlord accounts are in Supabase Auth, not in the `admins` table. The `admins` table is from the old Laravel system.

### Method 4: Check Your Environment Variables

Check if you already have landlord credentials set:

```bash
# In .env.test or .env.local
cat .env.test | grep TEST_LANDLORD
```

## Creating a New Landlord Account

### Method 1: Using the Registration Page (Easiest)

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Visit: `http://localhost:3000/admin/register`

3. Fill in the form:
   - Full Name
   - Email address
   - Password (min 8 characters)
   - Confirm Password

4. Submit the form

5. **Important**: Check your email for verification (if email confirmation is enabled)

### Method 2: Using the API

```bash
curl -X POST http://localhost:3000/api/auth/landlord/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "SecurePassword123!"
  }'
```

### Method 3: Using Supabase Dashboard

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **Add User** → **Create User**
3. Enter email and password
4. In **User Metadata**, add:
   ```json
   {
     "role": "landlord",
     "name": "Admin User"
   }
   ```

## Updating Landlord Password

### Method 1: Using the Script (Recommended)

```bash
cd storeflow
npx tsx scripts/reset-landlord-password.ts <email> <new-password>
```

Example:
```bash
npx tsx scripts/reset-landlord-password.ts admin@example.com NewPassword123!
```

### Method 2: Using Supabase Dashboard

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Find the landlord user by email
3. Click on the user
4. Click **Reset Password** or **Update User**
5. Enter the new password
6. Save changes

### Method 3: Using Supabase Admin API (Programmatic)

You can create a custom script using the Supabase Admin client:

```typescript
import { createAdminClient } from '@/lib/supabase/admin';

const adminClient = createAdminClient();

// Find user by email
const { data: users } = await adminClient.auth.admin.listUsers();
const user = users.users.find(u => u.email === 'admin@example.com');

// Update password
await adminClient.auth.admin.updateUserById(user.id, {
  password: 'NewPassword123!',
});
```

## Setting Up Test Credentials

After finding or creating your landlord account, update your `.env.test` file:

```env
TEST_LANDLORD_EMAIL=admin@example.com
TEST_LANDLORD_PASSWORD=YourPassword123!
```

Then run your E2E tests:

```bash
npm run test:e2e:chromium
```

## Troubleshooting

### "No landlord accounts found"

**Solution**: Create a new landlord account using one of the methods above.

### "Invalid credentials" when logging in

**Possible causes**:
1. Password is incorrect
2. Email is not confirmed (check Supabase dashboard)
3. Account doesn't have `role: landlord` in metadata

**Solution**:
1. Reset the password using the script
2. Verify email in Supabase dashboard
3. Check user metadata has `role: 'landlord'`

### "Access denied" error (403)

**Cause**: User exists but doesn't have `role: 'landlord'` in metadata.

**Solution 1: Using the Script (Recommended)**

```bash
cd storeflow
npx tsx scripts/fix-landlord-role.ts <email>
```

Example:
```bash
npx tsx scripts/fix-landlord-role.ts admin@example.com
```

This will update the user's metadata to include `role: 'landlord'`.

**Solution 2: Using Supabase Dashboard**

1. Go to Authentication → Users
2. Click on the user
3. Edit **User Metadata**
4. Add: `{ "role": "landlord" }`
5. Save

### Email verification required

If email verification is enabled in Supabase:
1. Check your email inbox for verification link
2. Or disable email verification in Supabase Dashboard → Authentication → Settings
3. Or use Supabase Admin API to auto-confirm emails

## Security Notes

⚠️ **Important**:
- Never commit passwords to version control
- Use strong passwords (min 8 characters, mix of letters, numbers, symbols)
- For production, use proper password reset flows (not direct password updates)
- Test credentials should be separate from production credentials

## Related Files

- Registration API: `src/app/api/auth/landlord/register/route.ts`
- Login API: `src/app/api/auth/landlord/login/route.ts`
- Registration Page: `src/app/admin/register/page.tsx`
- Login Page: `src/app/admin/login/page.tsx`
- Find Script: `scripts/find-landlord-account.ts`
- Reset Script: `scripts/reset-landlord-password.ts`
- Fix Role Script: `scripts/fix-landlord-role.ts`

