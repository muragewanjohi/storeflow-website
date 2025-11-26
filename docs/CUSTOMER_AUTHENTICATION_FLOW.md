# Customer Authentication Flow

## Current Implementation Explanation

### Issue: Why You Can View Account Without Signing Up

**The Problem:**
The account layout currently uses `requireAuthOrRedirect()` which checks for **Supabase authentication** (used for tenant admins), not customer-specific authentication. This means:

1. If you're logged into Supabase (as a tenant admin or through any Supabase auth), `getUser()` returns a user
2. The `getCurrentCustomer()` function has a fallback that automatically creates a customer record if you're authenticated via Supabase
3. So even without signing up as a customer, you can access the account page!

**The Flow:**
```
Account Layout
  ↓
requireAuthOrRedirect() → Checks Supabase Auth
  ↓
getCurrentCustomer() → If Supabase user exists:
  ↓
getOrCreateCustomer() → Auto-creates customer record!
  ↓
You can view account (even without customer registration)
```

### What Happens When You Sign Up

**Registration Process (`/customer-register`):**

1. **Form Submission:**
   - User fills out registration form (name, email, password, etc.)
   - Form validates input (password min 8 chars, email format, etc.)

2. **API Call (`/api/customers/auth/register`):**
   - Checks if customer with email already exists
   - Hashes password using bcrypt
   - Generates email verification token
   - Creates customer record in database:
     ```sql
     INSERT INTO customers (
       tenant_id, name, email, password, 
       username, mobile, company, 
       email_verified, email_verify_token
     )
     ```

3. **Response:**
   - Returns success with customer data
   - Sends welcome email (async, doesn't block)
   - Redirects to login page

4. **Important:** Registration does NOT automatically log you in!
   - You must login separately after registration

**Login Process (`/customer-login`):**

1. **Form Submission:**
   - User enters email and password

2. **API Call (`/api/customers/auth/login`):**
   - Finds customer by email in database
   - Verifies password using bcrypt.compare()
   - Creates session token (random 64-char hex string)
   - Sets two cookies:
     - `customer_session` - Session token (httpOnly, secure)
     - `customer_email` - Customer email for lookup (httpOnly, secure)
   - Merges guest cart into user cart (if exists)
   - Returns customer data

3. **Session Lookup (`getCurrentCustomer()`):**
   - Reads `customer_session` and `customer_email` cookies
   - Looks up customer by email in database
   - Returns customer record

4. **Access Account:**
   - Now you can access `/account` pages
   - Customer data is available for dashboard, orders, settings

## The Fix Needed

The account layout should check for **customer-specific authentication** (cookie-based), not Supabase authentication. This ensures only customers who have registered and logged in can access their account.

