# Supabase Password Reset Configuration

## Issue
When users click the password reset link in the email, they're redirected to `http://localhost:3000/login` instead of the tenant-specific URL like `http://scooters.localhost:3000/reset-password`.

## Root Cause
Supabase requires that all redirect URLs be explicitly allowed in the Supabase Dashboard. If a redirect URL is not in the allowed list, Supabase will use its default redirect URL instead.

## Solution

### Step 1: Add Redirect URLs to Supabase Dashboard

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add the following URLs:

**For Development:**
```
http://localhost:3000/reset-password
http://*.localhost:3000/reset-password
```

**For Production:**
```
https://*.dukanest.com/reset-password
https://www.dukanest.com/reset-password
https://dukanest.com/reset-password
```

**Note:** Supabase may not support wildcards (`*`) in redirect URLs. If that's the case, you'll need to add each tenant subdomain individually, or use a different approach.

### Step 2: Alternative Approach (If Wildcards Don't Work)

If Supabase doesn't support wildcards, you have two options:

#### Option A: Use a Single Reset Password Page on Main Domain
- Create a reset password page on the main domain: `https://www.dukanest.com/reset-password`
- This page can detect the tenant from the token and redirect accordingly
- Add only this URL to Supabase's allowed redirect URLs

#### Option B: Add Each Tenant Subdomain Individually
- As tenants are created, add their reset password URLs to Supabase
- This requires programmatic management of Supabase redirect URLs via API

### Step 3: Verify Configuration

After adding the redirect URLs:

1. Request a password reset from a tenant subdomain (e.g., `scooters.localhost:3000/forgot-password`)
2. Check the email - the reset link should include `redirect_to=http://scooters.localhost:3000/reset-password`
3. Click the link - it should redirect to the tenant-specific reset password page

## Current Implementation

The code in `src/app/api/auth/tenant/forgot-password/route.ts` correctly:
- Gets the tenant-specific origin from the request
- Constructs the redirect URL: `{tenant-origin}/reset-password`
- Passes it to Supabase's `generateLink()` method

However, Supabase will only use this redirect URL if it's in the allowed list in the dashboard.

## Testing

1. Add the redirect URLs to Supabase Dashboard
2. Request a password reset from `scooters.localhost:3000/forgot-password`
3. Check the email - verify the `redirect_to` parameter in the URL
4. Click the reset link - verify it redirects to `scooters.localhost:3000/reset-password`

## Debugging

If the redirect still doesn't work:

1. Check the server logs for the `redirectTo` value being passed to Supabase
2. Check the email link - verify the `redirect_to` parameter
3. Verify the URL is in Supabase's allowed redirect URLs list
4. Check Supabase Dashboard → Authentication → URL Configuration

