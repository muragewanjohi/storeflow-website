# Security: Landlord Access Blocking

**Critical security feature to prevent landlords from accessing tenant websites**

---

## Overview

Landlords (platform administrators) should **NEVER** be able to access tenant subdomains. This is a critical privacy and security requirement to:

1. **Protect Tenant Privacy:** Tenant data must remain private from platform administrators
2. **Prevent Data Breaches:** Landlords should not have access to customer orders, products, or any tenant-specific data
3. **Maintain Trust:** Tenants must trust that their data is isolated and secure
4. **Comply with Regulations:** Many jurisdictions require strict data isolation in multi-tenant systems

---

## Implementation

### Middleware Security Check

The middleware (`src/middleware.ts`) now includes a security check that:

1. **Detects Landlord Users:** Checks if the authenticated user has `role: 'landlord'`
2. **Blocks Tenant Access:** If a landlord tries to access a tenant subdomain, they are immediately blocked
3. **Redirects Safely:** Redirects landlords to the platform admin dashboard with an error message

### Code Location

```typescript
// src/middleware.ts (lines ~125-140)

// CRITICAL SECURITY: Block landlords from accessing tenant subdomains
// Landlords should only access the platform admin at /admin routes on marketing domain
const { data: { session } } = await supabase.auth.getSession();
if (session?.user) {
  const userRole = session.user.user_metadata?.role;
  if (userRole === 'landlord') {
    // Landlord trying to access tenant subdomain - BLOCK and redirect
    const url = request.nextUrl.clone();
    url.hostname = process.env.MARKETING_DOMAIN?.split(':')[0] || 'www.dukanest.com';
    url.protocol = 'https:';
    url.port = '';
    url.pathname = '/admin';
    url.searchParams.set('error', 'access-denied');
    url.searchParams.set('message', 'Landlords cannot access tenant websites for privacy and security reasons.');
    return NextResponse.redirect(url);
  }
}
```

---

## How It Works

### Request Flow

1. **User makes request** to tenant subdomain (e.g., `mystore.dukanest.com`)
2. **Middleware resolves tenant** from hostname
3. **Middleware checks user session** if authenticated
4. **If user is landlord:**
   - Request is **immediately blocked**
   - User is redirected to platform admin (`www.dukanest.com/admin`)
   - Error message is displayed
5. **If user is not landlord:**
   - Request proceeds normally
   - Tenant context is set
   - User can access tenant website

### Access Patterns

| User Type | Marketing Domain | Tenant Subdomain | Result |
|-----------|----------------|------------------|--------|
| **Landlord** | ✅ Allowed | ❌ **BLOCKED** | Redirected to `/admin` |
| **Tenant Admin** | ❌ Not allowed | ✅ Allowed | Can access tenant dashboard |
| **Tenant Staff** | ❌ Not allowed | ✅ Allowed | Can access tenant dashboard |
| **Customer** | ❌ Not allowed | ✅ Allowed | Can access storefront |
| **Unauthenticated** | ✅ Allowed | ✅ Allowed | Can browse storefront |

---

## Security Considerations

### Why This Matters

1. **Data Privacy:** Tenant data (orders, customers, products) must remain private
2. **Regulatory Compliance:** GDPR, CCPA, and other regulations require data isolation
3. **Business Trust:** Tenants must trust that platform admins cannot access their data
4. **Legal Protection:** Prevents potential legal issues from unauthorized data access

### Attack Scenarios Prevented

1. **Landlord Browsing Tenant Data:** Landlords cannot browse tenant storefronts or dashboards
2. **Session Hijacking:** Even if a landlord's session is compromised, they cannot access tenant sites
3. **Accidental Access:** Prevents accidental access from bookmarks or shared links
4. **Privilege Escalation:** Prevents landlords from using tenant admin credentials

---

## Testing

### Manual Testing

1. **As Landlord:**
   - Log in as landlord on `www.dukanest.com`
   - Try to access `mystore.dukanest.com`
   - **Expected:** Redirected to `/admin` with error message

2. **As Tenant Admin:**
   - Log in as tenant admin on `mystore.dukanest.com`
   - Access should work normally
   - **Expected:** Can access dashboard and storefront

3. **As Customer:**
   - Browse `mystore.dukanest.com` as customer
   - Access should work normally
   - **Expected:** Can browse storefront and login

### Automated Testing

Add E2E tests to verify:
- Landlords are blocked from tenant subdomains
- Tenant admins can access their subdomain
- Customers can access storefront
- Unauthenticated users can browse storefront

---

## Error Messages

When a landlord tries to access a tenant subdomain, they see:

- **Redirect URL:** `https://www.dukanest.com/admin?error=access-denied&message=...`
- **Message:** "Landlords cannot access tenant websites for privacy and security reasons."

---

## Related Security Features

1. **Row-Level Security (RLS):** Database-level tenant isolation
2. **API Route Protection:** Tenant-scoped API routes check user tenant_id
3. **Dashboard Layout Protection:** Dashboard routes require tenant admin/staff role
4. **Tenant Context Validation:** Server components verify user belongs to tenant

---

## Maintenance

### When to Review

- After adding new authentication methods
- After changing user role structure
- After modifying middleware logic
- During security audits

### Monitoring

Monitor for:
- Unusual redirect patterns (many landlord → tenant redirects)
- Failed access attempts
- Security logs

---

**Last Updated:** 2024  
**Security Level:** Critical

