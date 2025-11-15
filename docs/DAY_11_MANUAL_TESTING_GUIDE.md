# Day 11 Manual Testing Guide: Vercel Domain Management

**Purpose:** Comprehensive manual testing guide for domain management functionality  
**Date:** 2024  
**Status:** Ready for Testing

---

## 📋 Prerequisites

### 1. Environment Setup

Before testing, ensure you have:

- [ ] **Vercel Account** - Active account with a project
- [ ] **Vercel Token** - API token from Vercel Dashboard → Settings → Tokens
- [ ] **Vercel Project ID** - From your Vercel project settings
- [ ] **Test Domain** - A domain you own (or use a test subdomain)
- [ ] **Supabase Database** - With tenants table populated
- [ ] **Environment Variables** - Set in `.env.local`:
  ```env
  VERCEL_TOKEN=your-vercel-token-here
  VERCEL_PROJECT_ID=your-project-id-here
  NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```

### 2. Test Data Setup

Create a test tenant in your database:

```sql
-- Insert test tenant
INSERT INTO tenants (id, subdomain, name, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'teststore',
  'Test Store',
  'active',
  NOW(),
  NOW()
);
```

Or use Prisma Studio:
```bash
npm run db:studio
```

---

## 🧪 Test Scenarios

---

## Test 1: Domain Addition via API

### Objective: Verify domain can be added via API

### Steps:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Get your tenant ID:**
   - Query your database or use Prisma Studio
   - Note the tenant `id` (UUID)

3. **Test API endpoint directly:**
   ```bash
   # Using curl (PowerShell)
   $headers = @{
     "Content-Type" = "application/json"
   }
   $body = @{
     domain = "test.example.com"
   } | ConvertTo-Json
   
   Invoke-RestMethod -Uri "http://localhost:3000/api/admin/domains" `
     -Method POST `
     -Headers $headers `
     -Body $body
   ```

   Or use Postman/Thunder Client:
   - **URL:** `POST http://localhost:3000/api/admin/domains`
   - **Headers:** `Content-Type: application/json`
   - **Body:**
     ```json
     {
       "domain": "test.example.com"
     }
     ```

### Expected Results:

✅ **Success Response:**
```json
{
  "success": true,
  "domain": {
    "name": "test.example.com",
    "verified": false,
    "projectId": "...",
    ...
  },
  "message": "Domain added successfully"
}
```

✅ **Database Updated:**
- Check `tenants` table
- `custom_domain` field should be set to `"test.example.com"`

✅ **Vercel Dashboard:**
- Go to Vercel Dashboard → Your Project → Settings → Domains
- Domain should appear in the list

### Error Scenarios to Test:

❌ **Invalid Domain Format:**
```json
{
  "domain": "invalid-domain"
}
```
**Expected:** `400 Bad Request` with error message

❌ **Missing Domain:**
```json
{}
```
**Expected:** `400 Bad Request` - "Domain is required"

❌ **Duplicate Domain:**
- Try adding the same domain twice
**Expected:** Should handle gracefully (may return existing domain info)

---

## Test 2: Domain Verification Status

### Objective: Verify domain verification status can be checked

### Steps:

1. **Check domain verification:**
   ```bash
   # GET request
   Invoke-RestMethod -Uri "http://localhost:3000/api/admin/domains?domain=test.example.com" `
     -Method GET
   ```

### Expected Results:

✅ **Response includes:**
- `domain` - Domain information object
- `verification` - Verification status
- `dnsConfig` - DNS configuration instructions

✅ **Verification Status:**
```json
{
  "domain": {
    "name": "test.example.com",
    "verified": false,
    ...
  },
  "verification": {
    "verified": false,
    "verification": [
      {
        "type": "txt",
        "domain": "test.example.com",
        "value": "vercel-verify=...",
        "reason": "Domain verification pending"
      }
    ]
  },
  "dnsConfig": {
    "cnameTarget": "cname.vercel-dns.com",
    "verification": [...]
  }
}
```

---

## Test 3: DNS Configuration Instructions

### Objective: Verify DNS configuration instructions are displayed correctly

### Steps:

1. **Get DNS configuration:**
   ```bash
   Invoke-RestMethod -Uri "http://localhost:3000/api/admin/domains?domain=test.example.com" `
     -Method GET
   ```

2. **Check `dnsConfig` in response**

### Expected Results:

✅ **DNS Configuration includes:**
- **CNAME Record:**
  - Type: `CNAME`
  - Name: `test.example.com` (or `www.test.example.com`)
  - Value: `cname.vercel-dns.com` (or similar)

- **TXT Record (for verification):**
  - Type: `TXT`
  - Name: `test.example.com`
  - Value: `vercel-verify=...` (verification code)

- **Nameservers (if applicable):**
  - List of intended nameservers

### Manual DNS Setup Test:

1. **Go to your domain registrar** (e.g., Namecheap, GoDaddy)
2. **Add DNS records** as shown in the response
3. **Wait 5-10 minutes** for DNS propagation
4. **Verify domain again** - should show `verified: true` after DNS is configured

---

## Test 4: Domain Removal via API

### Objective: Verify domain can be removed

### Steps:

1. **Remove domain:**
   ```bash
   Invoke-RestMethod -Uri "http://localhost:3000/api/admin/domains?domain=test.example.com" `
     -Method DELETE
   ```

### Expected Results:

✅ **Success Response:**
```json
{
  "success": true,
  "message": "Domain removed successfully"
}
```

✅ **Database Updated:**
- `tenants.custom_domain` should be set to `NULL`

✅ **Vercel Dashboard:**
- Domain should be removed from project domains list

### Error Scenarios:

❌ **Domain Not Found:**
- Try removing a domain that doesn't exist
**Expected:** Should handle gracefully (may return success or error)

❌ **Domain Doesn't Belong to Tenant:**
- Try removing a domain from a different tenant
**Expected:** `403 Forbidden` - "Domain does not belong to this tenant"

---

## Test 5: UI - Domain Settings Page

### Objective: Test the domain management UI

### Steps:

1. **Access the domain settings page:**
   ```
   http://localhost:3000/dashboard/settings/domains
   ```

2. **Test as authenticated tenant:**
   - You'll need to be logged in as a tenant
   - Or mock the tenant context for testing

### Expected UI Elements:

✅ **Page loads without errors**

✅ **If no domain:**
- Shows "Add Custom Domain" form
- Input field for domain name
- Submit button
- Help text

✅ **If domain exists:**
- Shows current domain name
- Shows verification status (badge)
- Shows DNS configuration instructions
- "Verify Now" button (if not verified)
- "Remove Domain" button

### UI Interaction Tests:

1. **Add Domain:**
   - Enter domain: `test.example.com`
   - Click "Add Domain"
   - ✅ Should show success message
   - ✅ Should display domain info
   - ✅ Should show DNS configuration

2. **Verify Domain:**
   - Click "Verify Now" button
   - ✅ Should check verification status
   - ✅ Should update status badge

3. **Remove Domain:**
   - Click "Remove Domain"
   - ✅ Should show confirmation dialog
   - ✅ After confirmation, domain should be removed
   - ✅ Should show success message

---

## Test 6: Error Handling

### Objective: Test error scenarios

### Test Cases:

#### 6.1 Invalid Domain Format
- **Input:** `invalid-domain`
- **Expected:** Error message: "Invalid domain format"

#### 6.2 Empty Domain
- **Input:** (empty)
- **Expected:** Form validation error

#### 6.3 Network Error
- **Simulate:** Disconnect internet or block Vercel API
- **Expected:** Error message: "Failed to add domain"

#### 6.4 Missing Environment Variables
- **Test:** Remove `VERCEL_TOKEN` from `.env.local`
- **Expected:** Error: "Vercel project ID not configured" or similar

#### 6.5 Domain Already Exists
- **Test:** Add same domain twice
- **Expected:** Should handle gracefully (may return existing domain or error)

---

## Test 7: Integration with Tenant Context

### Objective: Verify domain management works with tenant context

### Steps:

1. **Set up tenant context:**
   - Ensure middleware is working
   - Access page via tenant subdomain: `teststore.localhost:3000`

2. **Test domain operations:**
   - Add domain
   - Verify it's associated with correct tenant
   - Check database `tenant_id` matches

### Expected Results:

✅ **Tenant Isolation:**
- Domain is associated with correct tenant
- Cannot access other tenants' domains
- Tenant ID matches in database

---

## Test 8: Vercel API Integration

### Objective: Verify direct Vercel API calls work

### Steps:

1. **Test using Vercel SDK directly:**
   ```typescript
   // Create test file: test-vercel-api.ts
   import { addTenantDomain, verifyDomain } from './src/lib/vercel-domains';
   
   async function test() {
     const domain = await addTenantDomain('test.example.com', 'your-project-id');
     console.log('Domain added:', domain);
     
     const verification = await verifyDomain('test.example.com');
     console.log('Verification:', verification);
   }
   
   test();
   ```

2. **Run test:**
   ```bash
   npx tsx test-vercel-api.ts
   ```

### Expected Results:

✅ **Domain added to Vercel**
✅ **Verification status returned**
✅ **No errors**

---

## Test 9: Database Consistency

### Objective: Verify database stays consistent

### Steps:

1. **Add domain via API**
2. **Check database:**
   ```sql
   SELECT id, subdomain, custom_domain, status 
   FROM tenants 
   WHERE custom_domain = 'test.example.com';
   ```

3. **Remove domain via API**
4. **Check database again:**
   ```sql
   SELECT custom_domain FROM tenants WHERE id = 'your-tenant-id';
   ```
   Should be `NULL`

### Expected Results:

✅ **Database updates correctly**
✅ **No orphaned records**
✅ **Tenant record stays intact**

---

## Test 10: Full Domain Lifecycle

### Objective: Test complete domain lifecycle

### Steps:

1. **Create tenant** (if not exists)
2. **Add domain** → Verify success
3. **Check verification status** → Should be `false`
4. **Get DNS instructions** → Should show required records
5. **Configure DNS** (in domain registrar)
6. **Wait for propagation** (5-10 minutes)
7. **Verify domain** → Should become `true`
8. **Remove domain** → Should succeed
9. **Verify removal** → Domain should be gone

### Expected Results:

✅ **All steps complete successfully**
✅ **Domain verified after DNS setup**
✅ **Clean removal**

---

## 📊 Test Checklist

### API Tests:
- [ ] Add domain via API
- [ ] Get domain info via API
- [ ] Verify domain via API
- [ ] Remove domain via API
- [ ] Error handling (invalid domain)
- [ ] Error handling (missing domain)
- [ ] Error handling (duplicate domain)

### UI Tests:
- [ ] Domain settings page loads
- [ ] Add domain form works
- [ ] Domain info displays correctly
- [ ] Verification status shows
- [ ] DNS instructions display
- [ ] Verify button works
- [ ] Remove button works
- [ ] Error messages display
- [ ] Success messages display

### Integration Tests:
- [ ] Tenant context integration
- [ ] Database updates correctly
- [ ] Vercel API integration
- [ ] Error handling throughout

### Edge Cases:
- [ ] Invalid domain format
- [ ] Empty domain
- [ ] Network errors
- [ ] Missing environment variables
- [ ] Domain already exists
- [ ] Domain not found

---

## 🐛 Common Issues & Troubleshooting

### Issue 1: "VERCEL_TOKEN environment variable is not set"
**Solution:** Add `VERCEL_TOKEN` to `.env.local`

### Issue 2: "Domain already exists"
**Solution:** Domain may already be in Vercel. Check Vercel dashboard or use `getDomainInfo()` first.

### Issue 3: "Domain not found"
**Solution:** Ensure domain was added successfully. Check Vercel dashboard.

### Issue 4: DNS not propagating
**Solution:** DNS changes can take 24-48 hours. Use `dig` or online DNS checker to verify.

### Issue 5: Verification always returns false
**Solution:** 
- Check DNS records are correct
- Wait for DNS propagation
- Verify TXT record is added correctly

### Issue 6: CORS errors
**Solution:** Ensure API routes are properly configured. Check middleware configuration.

---

## 📝 Test Results Template

```
Test Date: ___________
Tester: ___________

Test 1: Domain Addition
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Test 2: Domain Verification
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Test 3: DNS Configuration
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Test 4: Domain Removal
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Test 5: UI Testing
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Overall Status: [ ] All Pass [ ] Some Failures
Issues Found: ___________
```

---

## 🔗 Useful Resources

- [Vercel Domain API Docs](https://vercel.com/docs/rest-api/endpoints/domains)
- [DNS Checker](https://dnschecker.org/)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Supabase Dashboard](https://supabase.com/dashboard)

---

## ✅ Sign-off

After completing all tests:

- [ ] All critical tests passed
- [ ] Edge cases handled
- [ ] Documentation updated
- [ ] Issues logged (if any)
- [ ] Ready for production (or Day 12)

**Tested By:** ___________
**Date:** ___________
**Status:** [ ] Ready [ ] Needs Fixes

