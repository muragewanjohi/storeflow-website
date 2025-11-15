# Day 12: Authentication & Dashboard - Manual Testing Guide

**Date:** 2024  
**Day:** 12 - Supabase Authentication  
**Focus:** Authentication flows, protected routes, and dashboard access

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Testing Environment Setup](#testing-environment-setup)
3. [Landlord Authentication Testing](#landlord-authentication-testing)
4. [Tenant Authentication Testing](#tenant-authentication-testing)
5. [Dashboard Testing](#dashboard-testing)
6. [User Management Testing](#user-management-testing)
7. [Session Management Testing](#session-management-testing)
8. [Security Testing](#security-testing)
9. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### Required Setup

1. **Development Server Running**
   ```bash
   npm run dev
   ```
   Server should be running on `http://localhost:3000`

2. **Supabase Configuration**
   - Supabase project created
   - Environment variables configured in `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     ```

3. **Database Setup**
   - `tenants` table exists with at least one test tenant
   - Test tenant should have:
     - `subdomain`: `teststore` (or match `DEFAULT_TENANT_SUBDOMAIN`)
     - `status`: `active`
     - `name`: Any test name

4. **Browser Setup**
   - Use Chrome, Firefox, or Edge (latest version)
   - Enable Developer Tools (F12)
   - Clear browser cookies/cache before testing

---

## 🛠️ Testing Environment Setup

### 1. Create Test Tenant (if not exists)

**Via Supabase Dashboard:**
1. Go to Supabase Dashboard → Table Editor → `tenants`
2. Click "Insert row"
3. Fill in:
   - `subdomain`: `teststore`
   - `name`: `Test Store`
   - `status`: `active`
   - `custom_domain`: (leave null)
4. Click "Save"

**Via SQL Editor:**
```sql
INSERT INTO tenants (subdomain, name, status)
VALUES ('teststore', 'Test Store', 'active')
ON CONFLICT (subdomain) DO NOTHING;
```

### 2. Configure Environment Variables

Ensure `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DEFAULT_TENANT_SUBDOMAIN=teststore
```

### 3. Verify Middleware Configuration

Check that `src/middleware.ts` is properly configured to:
- Resolve tenant from hostname
- Set tenant headers
- Refresh auth sessions

---

## 🔐 Landlord Authentication Testing

### Test 1: Landlord Registration

**Objective:** Verify landlord can register successfully

**Steps:**
1. Navigate to `http://localhost:3000/admin/register`
2. Fill in registration form:
   - **Name:** `Test Admin`
   - **Email:** `admin@test.com` (use unique email)
   - **Password:** `password123` (min 8 characters)
   - **Confirm Password:** `password123`
3. Click "Create account"
4. Check browser console for errors (F12)

**Expected Results:**
- ✅ Form submits successfully
- ✅ Success message displayed: "Registration successful. Please check your email..."
- ✅ Redirects to `/admin/login` after 2 seconds
- ✅ No console errors

**Validation:**
- Check Supabase Dashboard → Authentication → Users
- Verify new user exists with email `admin@test.com`
- Verify `user_metadata.role` = `landlord`
- Verify `user_metadata.name` = `Test Admin`

**Common Issues:**
- ❌ "Email already registered" → Use different email
- ❌ "Password too short" → Use password with 8+ characters
- ❌ "Invalid email" → Check email format

---

### Test 2: Landlord Login

**Objective:** Verify landlord can login and access admin dashboard

**Prerequisites:**
- Landlord account created (from Test 1)

**Steps:**
1. Navigate to `http://localhost:3000/admin/login`
2. Fill in login form:
   - **Email:** `admin@test.com`
   - **Password:** `password123`
3. Click "Sign in"
4. Check browser console and Network tab

**Expected Results:**
- ✅ Login successful
- ✅ Redirects to `/admin/dashboard`
- ✅ Dashboard displays:
  - Welcome message with email
  - "Admin Dashboard" heading
  - Sign Out button
- ✅ No console errors

**Validation:**
- Check browser cookies:
  - `sb-<project-ref>-auth-token` exists
  - Cookie is `HttpOnly` and `Secure` (in production)
- Check Network tab:
  - `/api/auth/landlord/login` returns 200
  - Response includes `user` and `session` objects

**Common Issues:**
- ❌ "Invalid email or password" → Check credentials
- ❌ "Access denied. Landlord account required" → User role not set correctly
- ❌ Redirects to login → Session not created properly

---

### Test 3: Protected Admin Route Access

**Objective:** Verify unauthenticated users cannot access admin dashboard

**Steps:**
1. **Clear browser cookies** (or use Incognito/Private window)
2. Navigate directly to `http://localhost:3000/admin/dashboard`
3. Check what happens

**Expected Results:**
- ✅ Redirects to `/admin/login` (or shows error)
- ✅ Cannot access dashboard content
- ✅ Error message: "Authentication required" (if API route)

**Validation:**
- Check Network tab for 401/403 responses
- Verify redirect URL includes `?redirect=/admin/dashboard`

---

## 🏪 Tenant Authentication Testing

### Test 4: Tenant Admin Registration (via API)

**Objective:** Verify tenant admin can be created via API

**Prerequisites:**
- Test tenant exists with `subdomain: teststore`
- Access tenant subdomain: `http://teststore.localhost:3000` (or configure hosts file)

**Steps:**
1. **Option A: Via Postman**
   - Use `POST /api/auth/tenant/register` endpoint
   - Set `Host` header to `teststore.localhost:3000`
   - Body:
     ```json
     {
       "email": "tenant@test.com",
       "password": "password123",
       "name": "Tenant Admin",
       "role": "tenant_admin"
     }
     ```

2. **Option B: Via Browser Console**
   ```javascript
   fetch('/api/auth/tenant/register', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       email: 'muragedev@gmail.com',
       password: 'Avatar.12',
       name: 'Tenant Admin',
       role: 'tenant_admin'
     })
   }).then(r => r.json()).then(console.log)
   ```

**Expected Results:**
- ✅ Registration successful (201 status)
- ✅ Response includes `user` object with:
  - `role`: `tenant_admin`
  - `tenant_id`: matches test tenant ID
- ✅ User created in Supabase Auth

**Validation:**
- Check Supabase Dashboard → Authentication → Users
- Verify `user_metadata.tenant_id` matches tenant ID
- Verify `user_metadata.role` = `tenant_admin`

---

### Test 5: Tenant Login

**Objective:** Verify tenant admin can login and access tenant dashboard

**Prerequisites:**
- Tenant admin created (from Test 4)
- Access tenant subdomain: `http://teststore.localhost:3000`

**Steps:**
1. Navigate to `http://teststore.localhost:3000/login`
   - **Note:** If using `localhost:3000`, ensure `DEFAULT_TENANT_SUBDOMAIN=teststore` is set
2. Fill in login form:
   - **Email:** `tenant@test.com`
   - **Password:** `password123`
3. Click "Sign in"

**Expected Results:**
- ✅ Login successful
- ✅ Redirects to `/dashboard`
- ✅ Dashboard displays:
  - Tenant name in heading
  - Welcome message with email
  - Quick action cards
  - Sign Out button
- ✅ No console errors

**Validation:**
- Check cookies for auth token
- Verify tenant context is correct
- Check Network tab for successful API calls

**Common Issues:**
- ❌ "Access denied. User does not belong to this tenant" → Tenant ID mismatch
- ❌ "Access denied. Tenant admin or staff account required" → Wrong role
- ❌ Cannot access tenant subdomain → Check middleware tenant resolution

---

### Test 6: Tenant Staff Login

**Objective:** Verify tenant staff can login (with limited permissions)

**Prerequisites:**
- Tenant staff user created (via user management API)

**Steps:**
1. Create tenant staff user (see User Management Testing)
2. Login with staff credentials
3. Verify access to dashboard

**Expected Results:**
- ✅ Staff can login successfully
- ✅ Can access tenant dashboard
- ✅ Limited permissions (cannot manage users)

---

## 📊 Dashboard Testing

### Test 7: Admin Dashboard Access

**Objective:** Verify admin dashboard displays correctly

**Prerequisites:**
- Logged in as landlord

**Steps:**
1. Navigate to `http://localhost:3000/admin/dashboard`
2. Verify all elements are displayed

**Expected Results:**
- ✅ Page loads without errors
- ✅ Displays:
  - "Admin Dashboard" heading
  - User email in welcome message
  - Sign Out button (top right)
  - Stats cards (Total Tenants, Total Revenue, Active Subscriptions)
  - Welcome section
- ✅ All elements are styled correctly
- ✅ Responsive on mobile devices

**Validation:**
- Check browser console for errors
- Verify page is server-rendered (check page source)
- Test responsive design (resize browser)

---

### Test 8: Tenant Dashboard Access

**Objective:** Verify tenant dashboard displays correctly

**Prerequisites:**
- Logged in as tenant admin
- Access via tenant subdomain

**Steps:**
1. Navigate to `http://teststore.localhost:3000/dashboard`
2. Verify all elements are displayed

**Expected Results:**
- ✅ Page loads without errors
- ✅ Displays:
  - Tenant name in heading
  - User email in welcome message
  - Sign Out button
  - Stats cards (Total Products, Total Orders, Total Customers)
  - Quick Actions section with links:
    - Manage Products
    - View Orders
    - Manage Customers
    - Store Settings
- ✅ All links are clickable (may show 404 if pages not created yet)

**Validation:**
- Verify tenant context is correct
- Check that stats show correct tenant data (when implemented)
- Test navigation links

---

### Test 9: Dashboard Sign Out

**Objective:** Verify sign out functionality works

**Steps:**
1. Logged in to either admin or tenant dashboard
2. Click "Sign Out" button
3. Verify logout

**Expected Results:**
- ✅ Sign out successful
- ✅ Redirects to appropriate login page:
  - Admin dashboard → `/admin/login`
  - Tenant dashboard → `/login`
- ✅ Session cookies cleared
- ✅ Cannot access protected routes after logout

**Validation:**
- Check cookies are deleted
- Try accessing dashboard directly → should redirect to login
- Check Network tab for `/api/auth/logout` call

---

## 👥 User Management Testing

### Test 10: List Tenant Users

**Objective:** Verify tenant admin can list users

**Prerequisites:**
- Logged in as tenant admin
- At least one user exists for tenant

**Steps:**
1. **Via API (Postman/Browser Console):**
   ```javascript
   fetch('/api/admin/users', {
     headers: {
       'Cookie': document.cookie // Include auth cookies
     }
   }).then(r => r.json()).then(console.log)
   ```

2. **Via Postman:**
   - Use `GET /api/admin/users`
   - Set `Host` header to tenant subdomain
   - Include auth cookies

**Expected Results:**
- ✅ Returns 200 status
- ✅ Response includes `users` array
- ✅ Only users for current tenant are returned
- ✅ Each user has: `id`, `email`, `name`, `role`, `created_at`

**Validation:**
- Verify users belong to correct tenant
- Check that landlord users are not included
- Verify user count matches expected

---

### Test 11: Create Tenant Staff User

**Objective:** Verify tenant admin can create staff users

**Prerequisites:**
- Logged in as tenant admin

**Steps:**
1. **Via API:**
   ```javascript
   fetch('/api/admin/users', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Cookie': document.cookie
     },
     body: JSON.stringify({
       email: 'staff@test.com',
       password: 'password123',
       name: 'Staff User',
       role: 'tenant_staff'
     })
   }).then(r => r.json()).then(console.log)
   ```

**Expected Results:**
- ✅ Returns 201 status
- ✅ User created successfully
- ✅ Response includes user object with:
  - `role`: `tenant_staff`
  - `tenant_id`: matches current tenant
- ✅ User can login with created credentials

**Validation:**
- Check Supabase Auth → Users
- Verify user metadata is correct
- Test login with new credentials

---

### Test 12: Update User

**Objective:** Verify tenant admin can update user information

**Prerequisites:**
- User exists (from Test 11)
- Logged in as tenant admin

**Steps:**
1. **Via API:**
   ```javascript
   fetch('/api/admin/users/USER_ID', {
     method: 'PUT',
     headers: {
       'Content-Type': 'application/json',
       'Cookie': document.cookie
     },
     body: JSON.stringify({
       name: 'Updated Name',
       role: 'tenant_admin'
     })
   }).then(r => r.json()).then(console.log)
   ```

**Expected Results:**
- ✅ Returns 200 status
- ✅ User updated successfully
- ✅ Response includes updated user object
- ✅ Changes reflected in Supabase

**Validation:**
- Check user metadata in Supabase
- Verify role change (if changed)
- Test that user can still login

---

### Test 13: Delete User

**Objective:** Verify tenant admin can delete users (with restrictions)

**Prerequisites:**
- User exists (not the current logged-in user)
- Logged in as tenant admin

**Steps:**
1. **Via API:**
   ```javascript
   fetch('/api/admin/users/USER_ID', {
     method: 'DELETE',
     headers: {
       'Cookie': document.cookie
     }
   }).then(r => r.json()).then(console.log)
   ```

**Expected Results:**
- ✅ Returns 200 status
- ✅ User deleted successfully
- ✅ User cannot login after deletion
- ✅ Self-deletion prevented (if trying to delete own account)

**Validation:**
- Check Supabase Auth → Users (user should be deleted)
- Try logging in with deleted user → should fail
- Try deleting own account → should return error

---

## 🔄 Session Management Testing

### Test 14: Session Persistence

**Objective:** Verify session persists across page navigations

**Prerequisites:**
- Logged in to dashboard

**Steps:**
1. Login to dashboard
2. Navigate to different pages:
   - `/dashboard` → `/dashboard/settings` → `/dashboard/products`
3. Check session remains active

**Expected Results:**
- ✅ Session persists across navigations
- ✅ No re-login required
- ✅ User remains authenticated
- ✅ Cookies remain valid

**Validation:**
- Check cookies are not cleared
- Verify middleware refreshes session
- Check Network tab for session refresh calls

---

### Test 15: Token Refresh

**Objective:** Verify token refresh endpoint works

**Prerequisites:**
- Logged in user
- Have refresh token

**Steps:**
1. **Via API:**
   ```javascript
   fetch('/api/auth/refresh', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       refresh_token: 'YOUR_REFRESH_TOKEN'
     })
   }).then(r => r.json()).then(console.log)
   ```

**Expected Results:**
- ✅ Returns 200 status
- ✅ New access token returned
- ✅ New refresh token returned
- ✅ Session extended

**Validation:**
- Verify new tokens are different from old ones
- Test using new access token
- Check token expiration times

---

### Test 16: Session Expiration

**Objective:** Verify expired sessions are handled

**Steps:**
1. Login to dashboard
2. Wait for token expiration (or manually expire token)
3. Try accessing protected route

**Expected Results:**
- ✅ Session expiration detected
- ✅ Redirects to login page
- ✅ Error message displayed (if applicable)
- ✅ User must re-authenticate

**Validation:**
- Check token expiration time
- Verify middleware handles expired tokens
- Test automatic session refresh

---

## 🔒 Security Testing

### Test 17: Role-Based Access Control

**Objective:** Verify users can only access routes for their role

**Test Cases:**

1. **Landlord accessing tenant routes:**
   - Login as landlord
   - Try accessing `/dashboard` (tenant route)
   - **Expected:** Should redirect or show error

2. **Tenant admin accessing landlord routes:**
   - Login as tenant admin
   - Try accessing `/admin/dashboard`
   - **Expected:** Should redirect or show error

3. **Tenant staff accessing admin routes:**
   - Login as tenant staff
   - Try accessing `/api/admin/users`
   - **Expected:** Should return 403 Forbidden

**Validation:**
- Verify role checks in API routes
- Check middleware role verification
- Test permission-based access

---

### Test 18: Tenant Isolation

**Objective:** Verify users can only access their tenant's data

**Prerequisites:**
- Multiple tenants exist
- Users in different tenants

**Steps:**
1. Login as tenant admin for Tenant A
2. Try accessing data from Tenant B:
   - List users → should only show Tenant A users
   - Access Tenant B's subdomain → should redirect or show error

**Expected Results:**
- ✅ Users can only see their tenant's data
- ✅ Cross-tenant access prevented
- ✅ Tenant ID verified in all queries

**Validation:**
- Check API responses only include correct tenant data
- Verify RLS policies are working
- Test tenant context in middleware

---

### Test 19: Input Validation

**Objective:** Verify all inputs are validated

**Test Cases:**

1. **Registration:**
   - Invalid email format → Should show error
   - Password < 8 characters → Should show error
   - Missing required fields → Should show error

2. **Login:**
   - Invalid email → Should show error
   - Wrong password → Should show error
   - Empty fields → Should show error

3. **User Management:**
   - Invalid role → Should show error
   - Invalid email → Should show error
   - Missing required fields → Should show error

**Validation:**
- Check Zod validation errors
- Verify error messages are user-friendly
- Test SQL injection attempts (should be blocked)

---

### Test 20: CSRF Protection

**Objective:** Verify CSRF protection is enabled

**Steps:**
1. Login to dashboard
2. Check cookies for CSRF token
3. Try making request without CSRF token

**Expected Results:**
- ✅ CSRF tokens present (Next.js built-in)
- ✅ Requests without proper tokens rejected
- ✅ Same-origin policy enforced

**Validation:**
- Check cookie settings
- Verify SameSite attributes
- Test cross-origin requests

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Tenant not found" Error

**Symptoms:**
- Cannot access tenant subdomain
- Middleware redirects to 404

**Solutions:**
1. Check tenant exists in database:
   ```sql
   SELECT * FROM tenants WHERE subdomain = 'teststore';
   ```
2. Verify `DEFAULT_TENANT_SUBDOMAIN` environment variable
3. Check middleware tenant resolution logic
4. Verify hostname matches tenant subdomain

---

#### Issue 2: "Authentication required" Error

**Symptoms:**
- Cannot access protected routes
- Redirects to login even when logged in

**Solutions:**
1. Check cookies are set:
   - Open DevTools → Application → Cookies
   - Verify `sb-*-auth-token` exists
2. Check Supabase session:
   ```javascript
   // In browser console
   const { createClient } = await import('@/lib/supabase/client');
   const supabase = createClient();
   const { data: { session } } = await supabase.auth.getSession();
   console.log(session);
   ```
3. Verify middleware session refresh
4. Check environment variables are correct

---

#### Issue 3: "Access denied" Error

**Symptoms:**
- Login successful but cannot access dashboard
- 403 Forbidden errors

**Solutions:**
1. Check user role in Supabase:
   ```sql
   SELECT id, email, raw_user_meta_data->>'role' as role
   FROM auth.users
   WHERE email = 'user@example.com';
   ```
2. Verify role matches required role for route
3. Check RBAC middleware is working
4. Verify tenant_id matches (for tenant routes)

---

#### Issue 4: Session Not Persisting

**Symptoms:**
- Must login on every page navigation
- Cookies cleared immediately

**Solutions:**
1. Check cookie settings in middleware
2. Verify `createServerClient` configuration
3. Check browser cookie settings (not blocking cookies)
4. Verify HTTPS in production (cookies require secure context)

---

#### Issue 5: CORS Errors

**Symptoms:**
- API requests fail with CORS errors
- Cannot make requests from browser

**Solutions:**
1. Verify API routes are Next.js API routes (not external)
2. Check middleware configuration
3. Verify hostname matches allowed origins
4. Check Supabase CORS settings

---

## ✅ Testing Checklist

### Authentication
- [ ] Landlord registration works
- [ ] Landlord login works
- [ ] Tenant admin registration works
- [ ] Tenant login works
- [ ] Logout works
- [ ] Token refresh works

### Dashboard Access
- [ ] Admin dashboard accessible (landlord)
- [ ] Tenant dashboard accessible (tenant admin)
- [ ] Protected routes redirect when not authenticated
- [ ] Sign out clears session

### User Management
- [ ] List users works
- [ ] Create user works
- [ ] Update user works
- [ ] Delete user works
- [ ] Self-deletion prevented

### Security
- [ ] Role-based access control works
- [ ] Tenant isolation works
- [ ] Input validation works
- [ ] Session management works
- [ ] CSRF protection enabled

---

## 📝 Test Results Template

Use this template to document your test results:

```
Test Date: ___________
Tester: ___________
Environment: Development / Production

Test Results:
- Test 1: Landlord Registration: [ ] Pass [ ] Fail
- Test 2: Landlord Login: [ ] Pass [ ] Fail
- Test 3: Protected Routes: [ ] Pass [ ] Fail
- Test 4: Tenant Registration: [ ] Pass [ ] Fail
- Test 5: Tenant Login: [ ] Pass [ ] Fail
- Test 6: Staff Login: [ ] Pass [ ] Fail
- Test 7: Admin Dashboard: [ ] Pass [ ] Fail
- Test 8: Tenant Dashboard: [ ] Pass [ ] Fail
- Test 9: Sign Out: [ ] Pass [ ] Fail
- Test 10: List Users: [ ] Pass [ ] Fail
- Test 11: Create User: [ ] Pass [ ] Fail
- Test 12: Update User: [ ] Pass [ ] Fail
- Test 13: Delete User: [ ] Pass [ ] Fail
- Test 14: Session Persistence: [ ] Pass [ ] Fail
- Test 15: Token Refresh: [ ] Pass [ ] Fail
- Test 16: Session Expiration: [ ] Pass [ ] Fail
- Test 17: RBAC: [ ] Pass [ ] Fail
- Test 18: Tenant Isolation: [ ] Pass [ ] Fail
- Test 19: Input Validation: [ ] Pass [ ] Fail
- Test 20: CSRF Protection: [ ] Pass [ ] Fail

Issues Found:
1. ___________
2. ___________
3. ___________

Notes:
___________
```

---

## 🎯 Quick Testing Script

For quick testing, use this browser console script:

```javascript
// Quick Auth Test Script
async function testAuth() {
  console.log('Testing Authentication...');
  
  // Test 1: Register
  const registerRes = await fetch('/api/auth/landlord/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Admin',
      email: `admin${Date.now()}@test.com`,
      password: 'password123'
    })
  });
  console.log('Register:', await registerRes.json());
  
  // Test 2: Login
  const loginRes = await fetch('/api/auth/landlord/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@test.com',
      password: 'password123'
    })
  });
  console.log('Login:', await loginRes.json());
  
  // Test 3: Get Current User
  const meRes = await fetch('/api/auth/me');
  console.log('Current User:', await meRes.json());
}

testAuth();
```

---

**Last Updated:** 2024  
**Related Documentation:**
- [`DAY_12_COMPLETION.md`](./DAY_12_COMPLETION.md) - Day 12 completion summary
- [`POSTMAN_COLLECTION_GUIDE.md`](./POSTMAN_COLLECTION_GUIDE.md) - API testing guide

