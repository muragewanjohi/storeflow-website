# Vercel API Troubleshooting Guide

**Common issues and solutions for Vercel API integration**

---

## 🔐 Authorization Issues

### Error: "Not authorized: Trying to access resource under scope..."

**Problem:**
Your Vercel token doesn't have access to the project you're trying to use.

**Solution:**

1. **Check Token Scope:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard) → Settings → Tokens
   - Verify your token has the correct scope
   - For project-level access, token should have access to the specific project

2. **Create New Token with Correct Scope:**
   - Go to Vercel Dashboard → Settings → Tokens
   - Click **Create Token**
   - Select scope: **Full Account** (recommended) or **Specific Projects**
   - If selecting specific projects, ensure your project is included
   - Copy the token

3. **Update Environment Variable:**
   ```env
   VERCEL_TOKEN=your-new-token-here
   ```

4. **Verify Project ID:**
   - Go to Vercel Dashboard → Your Project → Settings → General
   - Copy the **Project ID**
   - Ensure it matches `VERCEL_PROJECT_ID` in your `.env.local`

---

## ✅ Verification Checklist

- [ ] `VERCEL_TOKEN` is set in `.env.local`
- [ ] Token has correct scope (Full Account or Project access)
- [ ] `VERCEL_PROJECT_ID` matches your actual project ID
- [ ] Token is not expired
- [ ] Project exists and is accessible

---

## 🧪 Testing Token Access

### Test Token with curl:

```bash
# Test token access
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.vercel.com/v10/projects/YOUR_PROJECT_ID

# Should return project information
```

### Test Domain Access:

```bash
# List domains for project
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.vercel.com/v10/projects/YOUR_PROJECT_ID/domains

# Should return list of domains
```

---

## 🔧 Common Fixes

### Fix 1: Token Scope Issue

**Symptoms:**
- "Not authorized" errors
- "Trying to access resource under scope" errors

**Fix:**
1. Create new token with **Full Account** scope
2. Update `VERCEL_TOKEN` in `.env.local`
3. Restart dev server

### Fix 2: Wrong Project ID

**Symptoms:**
- 404 errors when accessing domains
- "Project not found" errors

**Fix:**
1. Verify project ID in Vercel Dashboard
2. Update `VERCEL_PROJECT_ID` in `.env.local`
3. Restart dev server

### Fix 3: Token Expired

**Symptoms:**
- 401 Unauthorized errors
- "Invalid token" errors

**Fix:**
1. Generate new token
2. Update `VERCEL_TOKEN` in `.env.local`
3. Restart dev server

---

## 📝 Environment Variables Required

```env
# Vercel Configuration
VERCEL_TOKEN=your-vercel-token-here
VERCEL_PROJECT_ID=your-project-id-here
```

**How to get:**

1. **VERCEL_TOKEN:**
   - Vercel Dashboard → Settings → Tokens
   - Create new token with **Full Account** scope (recommended)
   - Or select **Specific Projects** and include your project

2. **VERCEL_PROJECT_ID:**
   - Vercel Dashboard → Your Project → Settings → General
   - Copy **Project ID** (not Project Name)

---

## 🐛 Debugging Tips

### Enable Verbose Logging

Add to your code temporarily:

```typescript
console.log('Vercel Token:', process.env.VERCEL_TOKEN ? 'Set' : 'Not set');
console.log('Project ID:', process.env.VERCEL_PROJECT_ID);
```

### Check API Response

Add error logging:

```typescript
catch (error: any) {
  console.error('Vercel API Error:', {
    message: error.message,
    status: error.status,
    response: error.response,
  });
  throw error;
}
```

---

## 🔗 Useful Links

- [Vercel API Documentation](https://vercel.com/docs/rest-api)
- [Vercel Tokens](https://vercel.com/docs/rest-api#authentication)
- [Vercel Dashboard](https://vercel.com/dashboard)

---

## 💡 Best Practices

1. **Use Full Account Scope** for development (easier to manage)
2. **Use Project-Specific Scope** for production (more secure)
3. **Rotate Tokens Regularly** for security
4. **Never Commit Tokens** to version control
5. **Use Environment Variables** for all sensitive data

---

**Still having issues?** Check the error message carefully - it usually indicates what's wrong!

