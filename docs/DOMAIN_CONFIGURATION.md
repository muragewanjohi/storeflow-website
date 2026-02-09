# Domain Configuration Guide

**Complete guide for managing domains across development and production environments**

---

## Current Setup Overview

Your application currently uses **`dukanest.com`** as the base domain. Here's how domains work:

### Domain Types

1. **Marketing Site Domain:**
   - Main site: `www.dukanest.com` or `dukanest.com`
   - Used for marketing pages, admin login, tenant registration

2. **Tenant Subdomains:**
   - Format: `{subdomain}.dukanest.com`
   - Example: `teststore.dukanest.com`
   - Each tenant gets their own subdomain

3. **Custom Domains (Optional):**
   - Tenants can configure their own custom domain
   - Example: `mystore.com` → points to tenant's store

---

## Environment Variables for Domains

### Key Variables

```env
# Main application URL (used for links, emails, etc.)
NEXT_PUBLIC_APP_URL=https://www.dukanest.com

# Base domain for tenant subdomains
NEXT_PUBLIC_BASE_DOMAIN=dukanest.com

# Marketing site domain (optional, defaults to www.dukanest.com)
MARKETING_DOMAIN=www.dukanest.com
```

---

## Production Setup (main branch)

### Vercel Domain Configuration

1. **Go to Vercel Dashboard → Your Project → Settings → Domains**

2. **Add Production Domains:**
   - `www.dukanest.com` (marketing site)
   - `dukanest.com` (apex domain)
   - `*.dukanest.com` (wildcard for tenant subdomains)

3. **DNS Configuration:**
   ```
   Type: A Record
   Host: @
   Value: 76.76.21.21 (Vercel's IP)
   
   Type: CNAME Record
   Host: www
   Value: cname.vercel-dns.com
   
   Type: CNAME Record
   Host: *
   Value: cname.vercel-dns.com
   ```

4. **Environment Variables (Production):**
   ```env
   NEXT_PUBLIC_APP_URL=https://www.dukanest.com
   NEXT_PUBLIC_BASE_DOMAIN=dukanest.com
   MARKETING_DOMAIN=www.dukanest.com
   ```

---

## Development Setup (dev branch)

### Option 1: Use Vercel Preview URL (Recommended)

**Best for:** Quick testing without DNS changes

1. **No custom domain needed** - Use Vercel's auto-generated preview URL
2. **Environment Variables (Preview):**
   ```env
   # Use the preview URL that Vercel generates
   NEXT_PUBLIC_APP_URL=https://dukanest-git-dev-yourteam.vercel.app
   
   # For tenant subdomains, you have two options:
   # Option A: Use a test domain (if you have one)
   NEXT_PUBLIC_BASE_DOMAIN=dev.dukanest.com
   
   # Option B: Use the preview URL pattern (requires code changes)
   # This won't work with subdomains, so tenants won't have subdomains in dev
   ```

**Limitation:** Tenant subdomains won't work with preview URLs (e.g., `teststore.dukanest-git-dev.vercel.app` won't resolve)

### Option 2: Use a Development Subdomain (Recommended for Full Testing)

**Best for:** Testing tenant subdomains and full domain functionality

1. **Add Development Domain in Vercel:**
   - Go to **Settings → Domains**
   - Add: `dev.dukanest.com`
   - **Assign to Git Branch:** Select `dev` branch
   - Configure DNS:
     ```
     Type: CNAME Record
     Host: dev
     Value: cname.vercel-dns.com
     ```

2. **Add Wildcard for Dev Subdomains:**
   - Add: `*.dev.dukanest.com`
   - Assign to `dev` branch
   - Configure DNS:
     ```
     Type: CNAME Record
     Host: *
     Value: cname.vercel-dns.com
     ```
   - **Note:** This requires a DNS provider that supports wildcard CNAMEs

3. **Environment Variables (Preview):**
   ```env
   NEXT_PUBLIC_APP_URL=https://dev.dukanest.com
   NEXT_PUBLIC_BASE_DOMAIN=dev.dukanest.com
   MARKETING_DOMAIN=dev.dukanest.com
   ```

**Result:**
- Marketing site: `dev.dukanest.com`
- Tenant stores: `teststore.dev.dukanest.com`

### Option 3: Use Separate Test Domain

**Best for:** Complete isolation from production

1. **Use a separate domain** (e.g., `dukanest-dev.com` or `test.dukanest.com`)
2. **Configure in Vercel:**
   - Add domain and assign to `dev` branch
   - Add wildcard: `*.dukanest-dev.com`
3. **Update environment variables accordingly**

---

## Code Hardcoding Issues

### Current Problem

Many places in the code have **hardcoded `dukanest.com`**:

```typescript
// Examples found:
- `https://${tenant.subdomain}.dukanest.com`
- `support@dukanest.com`
- `www.dukanest.com`
```

### Solution: Use Environment Variables

The code should use environment variables instead:

```typescript
// ✅ Good (already implemented in some places)
const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ❌ Bad (hardcoded)
const url = `https://${subdomain}.dukanest.com`;
```

---

## Recommended Setup for Your Situation

Since you're using the **preview deployment workflow** with a `dev` branch:

### Step 1: Configure Environment Variables in Vercel

1. Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**
2. Add/Update for **Preview** environment:

```env
# Main app URL (use preview URL or dev subdomain)
NEXT_PUBLIC_APP_URL=https://dukanest-git-dev-yourteam.vercel.app
# OR if you set up dev.dukanest.com:
# NEXT_PUBLIC_APP_URL=https://dev.dukanest.com

# Base domain for tenant subdomains
# Option A: Use dev subdomain (if configured)
NEXT_PUBLIC_BASE_DOMAIN=dev.dukanest.com

# Option B: Use production domain (tenants will use production subdomains)
# NEXT_PUBLIC_BASE_DOMAIN=dukanest.com

# Marketing domain
MARKETING_DOMAIN=dev.dukanest.com
# OR for preview URL:
# MARKETING_DOMAIN=dukanest-git-dev-yourteam.vercel.app
```

### Step 2: Choose Your Approach

#### Approach A: Simple (No Subdomain Testing)
- Use Vercel preview URL
- Tenant subdomains won't work in dev
- Good for: Testing features that don't require subdomains

#### Approach B: Full Testing (Recommended)
- Set up `dev.dukanest.com` domain
- Assign to `dev` branch in Vercel
- Configure DNS wildcard for `*.dev.dukanest.com`
- Tenant subdomains will work: `teststore.dev.dukanest.com`

---

## Domain Assignment in Vercel

### How to Assign Domain to Branch

1. **Go to:** Vercel Dashboard → Your Project → Settings → Domains
2. **Click on a domain** (or add new one)
3. **Click "Assign to Git Branch"**
4. **Select branch:** Choose `dev` for development domain
5. **Save**

### Domain Behavior

- **Production branch (main):** Uses domains assigned to "Production" or unassigned domains
- **Preview branches (dev, etc.):** Use domains assigned to that specific branch
- **Unassigned domains:** Default to production branch

---

## Testing Tenant Subdomains

### In Development (dev branch)

If using `dev.dukanest.com`:

1. **Create a test tenant** with subdomain `teststore`
2. **Access at:** `https://teststore.dev.dukanest.com`
3. **Verify:** Tenant resolution works correctly

### In Production (main branch)

1. **Create a test tenant** with subdomain `teststore`
2. **Access at:** `https://teststore.dukanest.com`
3. **Verify:** Tenant resolution works correctly

---

## Email Domain Configuration

### SendGrid Configuration

Your emails use `dukanest.com` domain. For development:

**Option 1: Use Same Domain (Simpler)**
- Use `noreply@dukanest.com` for both environments
- Emails will come from production domain even in dev

**Option 2: Use Dev Subdomain (More Isolated)**
- Set up `dev.dukanest.com` DNS records for email
- Use `noreply@dev.dukanest.com` in dev environment
- Requires additional DNS configuration (SPF, DKIM, DMARC)

**Recommended:** Use Option 1 for simplicity unless you need complete isolation.

---

## Environment Variable Summary

### Production (main branch)

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://www.dukanest.com
NEXT_PUBLIC_BASE_DOMAIN=dukanest.com
MARKETING_DOMAIN=www.dukanest.com
DISABLE_MFA_TEMPORARILY=false
```

### Development (dev branch - Preview)

```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=https://dev.dukanest.com
# OR: https://dukanest-git-dev-yourteam.vercel.app
NEXT_PUBLIC_BASE_DOMAIN=dev.dukanest.com
# OR: dukanest.com (if using production subdomains)
MARKETING_DOMAIN=dev.dukanest.com
DISABLE_MFA_TEMPORARILY=true
```

---

## Troubleshooting

### Tenant Subdomains Not Working in Dev

**Problem:** `teststore.dev.dukanest.com` doesn't resolve

**Solutions:**
1. **Check DNS:** Verify wildcard CNAME is configured
2. **Check Vercel:** Domain must be assigned to `dev` branch
3. **Check Environment:** `NEXT_PUBLIC_BASE_DOMAIN` must match your domain setup
4. **Test DNS:** `dig teststore.dev.dukanest.com` or `nslookup teststore.dev.dukanest.com`

### Preview URL Shows Wrong Domain

**Problem:** Preview deployment uses production domain

**Solutions:**
1. **Check branch:** Make sure you're pushing to `dev` branch
2. **Check domain assignment:** Domain should be assigned to `dev` branch
3. **Check environment variables:** Preview environment variables should be set

### Hardcoded Domains in Code

**Problem:** Code still references `dukanest.com` instead of using env vars

**Solution:** Update code to use environment variables (see "Code Hardcoding Issues" above)

---

## Quick Setup Checklist

### For Development Environment

- [ ] Create `dev` branch (already done ✅)
- [ ] Configure environment variables in Vercel (Preview environment)
- [ ] Decide on domain approach:
  - [ ] Option A: Use preview URL (simple, no subdomain testing)
  - [ ] Option B: Set up `dev.dukanest.com` (full testing)
- [ ] If Option B:
  - [ ] Add `dev.dukanest.com` domain in Vercel
  - [ ] Assign to `dev` branch
  - [ ] Configure DNS (CNAME for dev, wildcard for *.dev)
  - [ ] Wait for DNS propagation
- [ ] Test tenant creation and subdomain access
- [ ] Verify environment variables are working

---

## Best Practices

1. **Never hardcode domains** - Always use environment variables
2. **Use separate domains for dev/prod** - Prevents accidental production changes
3. **Test subdomain functionality** - Ensure tenant subdomains work in dev
4. **Document domain changes** - Keep track of DNS configurations
5. **Use preview URLs for quick testing** - Don't need full domain setup for simple tests

---

## Related Documentation

- [Vercel Development Environment Setup](./VERCEL_DEV_ENVIRONMENT.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Domain setup for production
- [Temporary 2FA Bypass](./TEMPORARY_2FA_BYPASS.md)

---

**Last Updated:** 2024
